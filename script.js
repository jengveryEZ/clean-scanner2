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

    webcam = new tmImage.Webcam(300, 300, true);
    await webcam.setup();
    await webcam.play();

    canvas.width = 300;
    canvas.height = 300;

    isRunning = true;
    loop();
});

/* ================= STOP SCAN ================= */
stopBtn.addEventListener("click", () => {
    if (!isRunning) return;

    isRunning = false;

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (webcam) {
        webcam.stop();
    }

    console.log("Scan stopped");
});

/* ================= LOOP ================= */
async function loop() {
    if (!isRunning) return;

    webcam.update();
    ctx.drawImage(webcam.canvas, 0, 0);
    await predict(webcam.canvas);

    animationId = requestAnimationFrame(loop);
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
async function predict(image) {
    const predictions = await model.predict(image);

    let clean = 0;
    let dirty = 0;

    predictions.forEach(p => {
        if (p.className === "clean") clean = p.probability;
        if (p.className === "dirty") dirty = p.probability;
    });

    cleanBar.style.width = `${clean * 100}%`;
    dirtyBar.style.width = `${dirty * 100}%`;

    cleanPercent.innerText = `${(clean * 100).toFixed(0)}%`;
    dirtyPercent.innerText = `${(dirty * 100).toFixed(0)}%`;
}
