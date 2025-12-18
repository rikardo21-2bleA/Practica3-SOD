require('dotenv').config();
const express = require('express');
const tf = require('@tensorflow/tfjs-node');
const path = require('path');

const app = express();
app.use(express.json());

// Variables de entorno
const PORT = process.env.PORT || 3002;

const MODEL_DIR = process.env.MODEL_DIR || './model';

let model = null;

// Cargar modelo
async function loadModel() {
    try {
        const modelPath = `file://${path.join(__dirname, 'model', 'model.json')}`;
        console.log(`Intentando cargar modelo desde: ${modelPath}`);
        model = await tf.loadGraphModel(modelPath);
        console.log('Modelo de IA cargado correctamente');
    } catch (err) {
        console.error('Error fatal cargando el modelo:', err);
    }
}
loadModel();


// Endpoints
app.get('/health', (req, res) => res.json({ status: "ok", service: "predict" }));

app.get('/ready', (req, res) => {
    if (model) res.status(200).json({ ready: true, modelVersion: "v1.0" });
    else res.status(503).json({ ready: false, message: "Model is loading" });
});

app.post('/predict', (req, res) => {
    if (!model) return res.status(503).json({ error: "Model not ready" });
    const { features } = req.body;

    if (!features || !Array.isArray(features) || features.length !== 7) {
        return res.status(400).json({ error: "Input inválido. Se esperan 7 features." });
    }

    try {
        const inputTensor = tf.tensor2d([features], [1, 7]);
        const result = model.predict(inputTensor).dataSync()[0];
        inputTensor.dispose(); 

        res.status(201).json({ prediction: result, timestamp: new Date().toISOString() });
        console.log(`Predicción: ${result}`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Fallo interno" });
    }
});

app.listen(PORT, () => console.log(`Servicio PREDICT en puerto ${PORT}`));
