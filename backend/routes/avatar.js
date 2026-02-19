const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createJob, getJob, processJobs } = require('../jobs/queue');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const STATIC_AVATARS = path.join(__dirname, '..', 'static', 'avatars');

[UPLOAD_DIR, STATIC_AVATARS].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname || 'file'}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/i.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error('Only images (jpeg, png, webp) allowed'));
  },
});

// POST /avatar/jobs - multipart: face, body
router.post('/jobs', upload.fields([{ name: 'face' }, { name: 'body' }]), async (req, res) => {
  try {
    const faceFile = req.files?.face?.[0];
    const bodyFile = req.files?.body?.[0];

    if (!faceFile || !bodyFile) {
      return res.status(400).json({
        error: 'Both face and body images are required',
      });
    }

    const jobId = uuidv4();
    const job = createJob(jobId, {
      facePath: faceFile.path,
      bodyPath: bodyFile.path,
    });

    processJobs();

    res.status(201).json({ jobId });
  } catch (err) {
    console.error('[POST /avatar/jobs]', err);
    res.status(500).json({ error: err.message || 'Failed to create job' });
  }
});

// GET /avatar/jobs/:jobId
router.get('/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    avatarUrl: job.avatarUrl,
    error: job.error,
  });
});

module.exports = router;
