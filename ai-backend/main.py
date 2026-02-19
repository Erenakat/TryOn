"""
AI Avatar Backend – genererer avatar fra fjesbilde.
Bruk: uvicorn main:app --host 0.0.0.0 --port 8000
"""
import io
import base64
import uuid
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
from PIL import Image
import mediapipe as mp

app = FastAPI(title="Avatar AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

mp_face = mp.solutions.face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
)


def extract_face(image: np.ndarray) -> np.ndarray | None:
    """Hent fjes fra bilde med MediaPipe."""
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = mp_face.process(rgb)
    if not results.multi_face_landmarks:
        return None
    h, w = image.shape[:2]
    lms = results.multi_face_landmarks[0]
    xs = [int(lm.x * w) for lm in lms.landmark]
    ys = [int(lm.y * h) for lm in lms.landmark]
    x1, x2 = max(0, min(xs) - 20), min(w, max(xs) + 20)
    y1, y2 = max(0, min(ys) - 20), min(h, max(ys) + 20)
    face = image[y1:y2, x1:x2]
    if face.size == 0:
        return None
    return face


def make_avatar(face_img: np.ndarray) -> bytes:
    """Lag avatar: sirkulært fjes på kroppsfigur."""
    size = 400
    canvas = np.ones((size, 280, 3), dtype=np.uint8) * 255

    # Resize face til sirkel
    face_h, face_w = face_img.shape[:2]
    dim = min(face_h, face_w)
    face_crop = face_img[:dim, :dim] if face_h >= face_w else face_img[:, :dim]
    face_small = cv2.resize(face_crop, (140, 140))

    # Mask til sirkel
    mask = np.zeros((140, 140), dtype=np.uint8)
    cv2.circle(mask, (70, 70), 68, 255, -1)

    # Plasser fjes øverst
    y_offset = 30
    x_center = 140
    roi = canvas[y_offset : y_offset + 140, x_center - 70 : x_center + 70]
    if roi.shape[:2] == (140, 140):
        roi[:] = cv2.bitwise_and(face_small, face_small, mask=mask)
        # Hvit bakgrunn der mask=0
        inv_mask = cv2.bitwise_not(mask)
        roi[inv_mask > 0] = 255

    # Kropp (enkel form)
    body_color = (232, 228, 224)
    pts = np.array(
        [
            [x_center - 50, 175],
            [x_center + 50, 175],
            [x_center + 45, 370],
            [x_center - 45, 370],
        ],
        np.int32,
    )
    cv2.fillPoly(canvas, [pts], body_color)
    cv2.ellipse(
        canvas,
        (x_center, 165),
        (55, 25),
        0,
        0,
        360,
        body_color,
        -1,
    )

    _, buf = cv2.imencode(".png", canvas)
    return buf.tobytes()


class AvatarResponse(BaseModel):
    success: bool
    avatar_base64: str | None = None
    error: str | None = None


@app.post("/avatar", response_model=AvatarResponse)
async def create_avatar(file: UploadFile = File(...)):
    """Last opp fjesbilde, få tilbake avatar som base64 PNG."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Kun bilder tillatt")
    try:
        data = await file.read()
        arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return AvatarResponse(success=False, error="Kunne ikke lese bildet")
        face = extract_face(img)
        if face is None:
            return AvatarResponse(
                success=False,
                error="Ingen fjes funnet. Prøv et tydeligere selfie.",
            )
        avatar_bytes = make_avatar(face)
        b64 = base64.b64encode(avatar_bytes).decode()
        return AvatarResponse(success=True, avatar_base64=b64)
    except Exception as e:
        return AvatarResponse(success=False, error=str(e))


@app.get("/health")
def health():
    return {"ok": True}
