const express = require('express');
const tf = require('@tensorflow/tfjs-node');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;
const MODEL_DIR = process.env.MODEL_DIR || './model';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/predict_db';

let model = null;

// --- CONEXIÓN A MONGODB ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('Predict conectado a MongoDB'))
    .catch(err => console.error('MongoDB no disponible:', err.message));

// --- SCHEMA PARA PREDICCIONES ---
const PredictionSchema = new mongoose.Schema({
    features: [Number],
    prediction: Number,
    dataId: String,
    source: String,
    modelVersion: String,
    createdAt: { type: Date, default: Date.now }
});

const Prediction = mongoose.model('Prediction', PredictionSchema);

// --- CARGAR MODELO ---
async function loadModel() {
    try {
        const modelPath = `file://${path.join(__dirname, 'model', 'model.json')}`;
        console.log('Cargando modelo desde:', modelPath);
        model = await tf.loadGraphModel(modelPath);
        console.log('Modelo de IA cargado\n');
    } catch (err) {
        console.log('Modelo no disponible, usando predicción simulada\n');
    }
}
loadModel();

// --- ENDPOINTS ---

app.get('/health', (req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({ 
        status: "ok", 
        service: "predict",
        mongodb: mongoStatus,
        modelLoaded: model !== null
    });
});

app.post('/predict', async (req, res) => {
    try {
        console.log('\n=== PETICIÓN /predict ===');
        
        const { features, meta } = req.body;

        // VALIDAR INPUT
        if (!features || !Array.isArray(features) || features.length !== 7) {
            return res.status(400).json({ 
                error: "Se esperan 7 features numéricas",
                received: features
            });
        }

        console.log('Features recibidas:', features);

        let prediction;

        if (model) {
            // PREDICCIÓN REAL CON IA
            console.log('Ejecutando modelo de IA...');
            const inputTensor = tf.tensor2d([features], [1, 7]);
            prediction = model.predict(inputTensor).dataSync()[0];
            inputTensor.dispose();
            console.log('Predicción IA:', prediction);
        } else {
            // PREDICCIÓN SIMULADA
            console.log('Modelo no disponible, simulando...');
            // Simulación: promedio ponderado de las features
            prediction = features.reduce((a, b) => a + b, 0) / features.length / 100;
            prediction = parseFloat(prediction.toFixed(4));
            console.log('Predicción simulada:', prediction);
        }

        // GUARDAR EN MONGODB
        if (mongoose.connection.readyState === 1) {
            try {
                const nuevaPrediccion = new Prediction({
                    features: features,
                    prediction: prediction,
                    dataId: meta?.dataId || 'unknown',
                    source: meta?.source || 'unknown',
                    modelVersion: model ? 'v1.0' : 'simulated'
                });

                await nuevaPrediccion.save();
                console.log('Guardado en MongoDB:', nuevaPrediccion._id);
            } catch (dbError) {
                console.log('No se pudo guardar en MongoDB');
            }
        }

        // RESPUESTA
        res.status(201).json({ 
            prediction: prediction,
            timestamp: new Date().toISOString(),
            modelVersion: model ? 'v1.0' : 'simulated'
        });

        console.log('Respuesta enviada\n');

    } catch (err) {
        console.error('ERROR:', err.message);
        res.status(500).json({ 
            error: "Error interno en predicción",
            details: err.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`PREDICT en puerto ${PORT}\n`);
});
