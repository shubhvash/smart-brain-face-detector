import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';

// In-browser face detection using MediaPipe (replaces the Clarifai API).
// The WASM runtime and model are self-hosted from /public, so no API key or
// third-party service is involved.
const WASM_PATH = `${process.env.PUBLIC_URL}/mediapipe-wasm`;
const MODEL_PATH = `${process.env.PUBLIC_URL}/models/blaze_face_short_range.tflite`;

let detectorPromise = null;

const getDetector = () => {
  if (!detectorPromise) {
    detectorPromise = FilesetResolver.forVisionTasks(WASM_PATH)
      .then(vision => FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5
      }))
      .catch(err => {
        detectorPromise = null; // allow a retry on the next call
        throw err;
      });
  }
  return detectorPromise;
};

// Returns face bounding boxes as fractions (0..1) of the image's natural size:
// [{ left, top, right, bottom }]
export const detectFaces = async (imageElement) => {
  const detector = await getDetector();
  const { naturalWidth, naturalHeight } = imageElement;
  const { detections } = detector.detect(imageElement);

  return detections.map(({ boundingBox }) => ({
    left: boundingBox.originX / naturalWidth,
    top: boundingBox.originY / naturalHeight,
    right: (boundingBox.originX + boundingBox.width) / naturalWidth,
    bottom: (boundingBox.originY + boundingBox.height) / naturalHeight
  }));
};
