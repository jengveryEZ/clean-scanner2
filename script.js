const MODEL_URL = "./my_model/";

let model, webcam;
let isRunning = false;
let animationId = null;


const canvas = document.getElementById("imageCanvas");
const ctx = canvas.getContext("2d");

const cleanBar = document.getElementById("cleanBar");
const dirtyBar = document.getElementById("dirtyBar");
const cleanPercent = document.getElementById("cleanPercent");
const dirtyPercent = document.getElementById("dirtyPercent");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const uploadBtn = document.getElementById("uploadBtn");
const uploadInput = document.getElementById("upload");
const switchCameraBtn = document.getElementById("switchCameraBtn");
let useFrontCamera = true;  



async function loadModel() {
    if (model) return;
    model = await tmImage.load(
        MODEL_URL + "model.json",
        MODEL_URL + "metadata.json"
    );
    console.log("Model loaded");
}

/* ================= START SCAN ================= */
startBtn.addEventListener("click", async () => {
    if (isRunning) return;

    await loadModel();

    webcam = new tmImage.Webcam(300, 300, useFrontCamera);
    await webcam.setup();
    await webcam.play();

    canvas.width = 300;
    canvas.height = 300;

    isRunning = true;
    loop();
});

/* ================= STOP SCAN ================= */
stopBtn.addEventListener("click", () => {
    isRunning = false;

    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    if (webcam) {
        webcam.stop();
    }
});

/* ================= LOOP ================= */
async function loop() {
    if (!isRunning) return;

    webcam.update();
    await predict();
    animationId = requestAnimationFrame(loop);
}

/* ================= PREDICT ================= */
async function predict(source = webcam.canvas) {

    if (!model) return;

    const prediction = await model.predict(source);

    let cleanValue = 0;
    let dirtyValue = 0;

    prediction.forEach(p => {
        if (p.className === "clean") cleanValue = p.probability;
        if (p.className === "dirty") dirtyValue = p.probability;
    });

    cleanBar.style.width = (cleanValue * 100) + "%";
    dirtyBar.style.width = (dirtyValue * 100) + "%";

    cleanPercent.textContent = Math.round(cleanValue * 100) + "%";
    dirtyPercent.textContent = Math.round(dirtyValue * 100) + "%";

    if (webcam) {
        ctx.drawImage(webcam.canvas, 0, 0, canvas.width, canvas.height);
    }
}



/* ================= UPLOAD IMAGE ================= */
uploadBtn.addEventListener("click", () => {
    uploadInput.click();
});

uploadInput.addEventListener("change", async (e) => {
    if (!e.target.files.length) return;

    // ถ้ากล้องกำลังทำงาน → หยุดก่อน
    stopBtn.click();

    await loadModel();

    const img = new Image();
    img.src = URL.createObjectURL(e.target.files[0]);

    img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        await predict(canvas);
    };
});

/* ================= PREDICT ================= */
switchCameraBtn.addEventListener("click", async () => {

    if (!webcam) return;

    isRunning = false;
    if (animationId) cancelAnimationFrame(animationId);

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === "videoinput");

    if (videoDevices.length < 2) {
        console.log("Only one camera available");
        isRunning = true;
        loop();
        return;
    }

    useFrontCamera = !useFrontCamera;
    const deviceIndex = useFrontCamera ? 0 : 1;

    webcam.stop();

    webcam = new tmImage.Webcam(300, 300, false);

    await webcam.setup({
        deviceId: videoDevices[deviceIndex].deviceId
    });

    await webcam.play();

    isRunning = true;
    loop();
});



