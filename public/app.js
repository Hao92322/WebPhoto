const $ = (id) => document.getElementById(id);
let selectedChoice = null;
let cameraStream = null;
let photoBlob = null;
let sending = false;
let openingCamera = false;
let cameraAttempt = 0;

function setStatus(message) { $('status').textContent = message; }
function resetPreview() {
  photoBlob = null;
  $('captured').removeAttribute('src');
  $('captured').classList.add('hidden');
  $('preview').classList.remove('hidden');
  $('capture').disabled = true;
}
function choose(choice) {
  selectedChoice = choice;
  $('question-panel').classList.add('hidden');
  $('camera-panel').classList.remove('hidden');
  $('done-panel').classList.add('hidden');
  $('choice-summary').textContent = `Bạn đã chọn: ${choice}`;
}
$('yes').addEventListener('click', () => choose('Có'));
$('no').addEventListener('click', () => choose('Không'));

async function openCamera() {
  if (openingCamera || sending) return;
  resetPreview();
  stopCamera();
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('Trình duyệt không hỗ trợ camera ở địa chỉ này. Hãy dùng HTTPS hoặc localhost.');
    return;
  }
  openingCamera = true;
  $('open-camera').disabled = true;
  const attempt = ++cameraAttempt;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 960 } },
    });
    if (attempt !== cameraAttempt) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    cameraStream = stream;
    const video = $('preview');
    video.srcObject = stream;
    await video.play();
    if (attempt !== cameraAttempt) return;
    $('capture').disabled = false;
    setStatus('Camera đã mở. Nhấn “Chụp ảnh” để xem ảnh trước khi gửi.');
  } catch (error) {
    if (attempt !== cameraAttempt) return;
    stopCamera();
    setStatus(error.name === 'NotAllowedError'
      ? 'Bạn chưa cho phép dùng camera. Hãy cấp quyền trong trình duyệt rồi mở lại.'
      : `Không mở được camera: ${error.message}`);
  } finally {
    if (attempt === cameraAttempt) {
      openingCamera = false;
      $('open-camera').disabled = false;
    }
  }
}
async function snapPhoto() {
  const video = $('preview');
  if (!cameraStream || !video.videoWidth || !video.videoHeight) {
    setStatus('Camera chưa sẵn sàng. Hãy mở camera và thử lại.');
    return;
  }
  $('capture').disabled = true;
  const attempt = cameraAttempt;
  try {
    const canvas = $('canvas');
    const scale = Math.min(1, 1280 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (attempt !== cameraAttempt) return;
    if (!blob) throw new Error('Không tạo được ảnh. Hãy chụp lại.');
    photoBlob = blob;
    $('captured').src = canvas.toDataURL('image/jpeg', 0.82);
    $('captured').classList.remove('hidden');
    $('preview').classList.add('hidden');
    stopCamera();
    setStatus('Ảnh chưa được gửi. Nhấn “Gửi ảnh qua Telegram” để xác nhận chia sẻ.');
  } catch (error) {
    setStatus(error.message);
    $('capture').disabled = !cameraStream;
  }
  send();
}
async function send() {
  if (sending || !photoBlob || !selectedChoice) return;
  sending = true;
  $('open-camera').disabled = true;
  $('cancel').disabled = true;
  setStatus('Đang gửi ảnh đến Telegram…');
  const form = new FormData();
  form.append('choice', selectedChoice);
  form.append('photo', photoBlob, 'selfie.jpg');
  try {
    const response = await fetch('/api/send-photo', { method: 'POST', body: form });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Gửi ảnh thất bại.');
    $('camera-panel').classList.add('hidden');
    $('done-panel').classList.remove('hidden');
    $('done-message').textContent = 'Ảnh và câu trả lời của bạn đã được gửi đến Telegram của chủ trang.';
    resetPreview();
    setStatus('Gửi ảnh thành công.');
  } catch (error) {
    setStatus(error.message);
  } finally {
    sending = false;
    $('open-camera').disabled = false;
    $('cancel').disabled = false;
  }
}
function stopCamera() {
  if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  $('preview').srcObject = null;
  $('capture').disabled = true;
}
function returnToQuestion() {
  if (sending) return;
  cameraAttempt += 1;
  openingCamera = false;
  $('open-camera').disabled = false;
  stopCamera();
  resetPreview();
  selectedChoice = null;
  $('camera-panel').classList.add('hidden');
  $('done-panel').classList.add('hidden');
  $('question-panel').classList.remove('hidden');
  setStatus('');
}
$('open-camera').addEventListener('click', openCamera);
$('capture').addEventListener('click', snapPhoto);
$('cancel').addEventListener('click', returnToQuestion);
$('again').addEventListener('click', returnToQuestion);
window.addEventListener('pagehide', () => { cameraAttempt += 1; stopCamera(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && (cameraStream || openingCamera)) {
    cameraAttempt += 1;
    openingCamera = false;
    $('open-camera').disabled = false;
    stopCamera();
    setStatus('Camera đã tắt khi bạn rời trang. Nhấn “Mở camera / Chụp lại” để tiếp tục.');
  }
});
