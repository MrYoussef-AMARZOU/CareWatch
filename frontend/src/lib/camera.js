const DEFAULT_VIDEO_CONSTRAINTS = {
  width: { ideal: 640 },
  height: { ideal: 480 },
  facingMode: "user",
  frameRate: { ideal: 30 }
};

const configuredCameraName = (import.meta.env.VITE_CAMERA_NAME || "").trim();
const configuredCameraIndex = (import.meta.env.VITE_CAMERA_INDEX || "").trim();

const cameraIndex = configuredCameraIndex === ""
  ? null
  : Number.parseInt(configuredCameraIndex, 10);

const hasConfiguredCameraIndex = Number.isInteger(cameraIndex) && cameraIndex >= 0;
const hasCameraSelector = Boolean(configuredCameraName) || configuredCameraIndex !== "";

const stopStream = (stream) => {
  stream?.getTracks().forEach((track) => track.stop());
};

const listVideoInputs = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === "videoinput");
};

const findConfiguredDevice = (devices) => {
  if (configuredCameraName) {
    const normalizedName = configuredCameraName.toLocaleLowerCase();
    return devices.find((device) => device.label.toLocaleLowerCase() === normalizedName)
      || devices.find((device) => device.label.toLocaleLowerCase().includes(normalizedName));
  }

  if (hasConfiguredCameraIndex) return devices[cameraIndex];
  return null;
};

const cameraSelectionError = (devices) => {
  const available = devices
    .map((device, index) => `${index}: ${device.label || "unnamed camera"}`)
    .join(", ");
  const selector = configuredCameraName
    ? `VITE_CAMERA_NAME="${configuredCameraName}"`
    : `VITE_CAMERA_INDEX="${configuredCameraIndex}"`;
  return new Error(`Configured camera ${selector} was not found. Available video inputs: ${available || "none"}`);
};

export async function getCameraStream() {
  if (!hasCameraSelector) {
    return navigator.mediaDevices.getUserMedia({ video: DEFAULT_VIDEO_CONSTRAINTS });
  }

  // Labels are usually unavailable until camera permission has been granted.
  const permissionStream = await navigator.mediaDevices.getUserMedia({
    video: DEFAULT_VIDEO_CONSTRAINTS
  });
  stopStream(permissionStream);

  const devices = await listVideoInputs();
  const selectedDevice = findConfiguredDevice(devices);
  if (!selectedDevice) throw cameraSelectionError(devices);

  return navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 },
      deviceId: { exact: selectedDevice.deviceId }
    }
  });
}
