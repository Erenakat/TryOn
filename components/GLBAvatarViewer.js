import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const createViewerHtml = (avatarUrl, initialRotation) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <style>body{margin:0;background:#fff;overflow:hidden;}</style>
</head>
<body>
  <div id="container"></div>
  <script src="https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.150.0/examples/js/loaders/GLTFLoader.js"></script>
  <script>
    const rotation = { value: ${initialRotation} };
    window.setRotation = (deg) => { rotation.value = deg; };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1, 3);
    camera.lookAt(0, 1, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(300, 400);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    document.getElementById('container').appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(2, 4, 3);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    let model = null;
    const loader = new THREE.GLTFLoader();
    loader.load('${avatarUrl}', (gltf) => {
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      model.position.sub(center);
      model.position.y += size.y / 2;
      model.scale.setScalar(1.6 / maxDim);
      scene.add(model);
    }, undefined, (err) => {
      console.error('GLB load error:', err);
    });

    function animate() {
      requestAnimationFrame(animate);
      if (model) {
        model.rotation.y = (rotation.value * Math.PI) / 180;
      }
      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>
`;

export default function GLBAvatarViewer({ avatarUrl, rotation = 0 }) {
  const webRef = useRef(null);

  useEffect(() => {
    if (webRef.current && avatarUrl) {
      webRef.current.injectJavaScript(
        `window.setRotation && window.setRotation(${rotation}); true;`
      );
    }
  }, [rotation, avatarUrl]);

  if (!avatarUrl) return null;

  const fullUrl = avatarUrl.startsWith('http')
    ? avatarUrl
    : `${avatarUrl}`;

  const html = createViewerHtml(fullUrl, rotation);

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 400,
    backgroundColor: '#fff',
  },
  webview: {
    width: 300,
    height: 400,
    backgroundColor: 'transparent',
  },
});
