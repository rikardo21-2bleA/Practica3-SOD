require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Puertos y URLs de los otros microservicios
const PORT = process.env.PORT || 8080;
const ACQUIRE_URL = process.env.ACQUIRE_URL || 'http://acquire:3001';
const PREDICT_URL = process.env.PREDICT_URL || 'http://predict:3002';


app.get('/health', (req, res) => {
    res.json({ status: "ok", service: "orchestrator" });
});

// Flujo Completo 
app.post('/run', async (req, res) => {
    try {
        console.log("Iniciando flujo de predicción...");

        // PASO 1: Pedir datos a ACQUIRE (Simulado, no por API)
        console.log(`1. Llamando a Acquire (${ACQUIRE_URL}/data)...`);
        const acquireResponse = await axios.post(`${ACQUIRE_URL}/data`);
        const { features, dataId } = acquireResponse.data;
        
        if (!features) throw new Error("Acquire no devolvió features");
        console.log("Datos recibidos:", features);

        // PASO 2: Enviar datos a PREDICT
        console.log(`2. Llamando a Predict (${PREDICT_URL}/predict)...`);
        const predictResponse = await axios.post(`${PREDICT_URL}/predict`, {
            features: features,
            meta: { dataId: dataId, source: "orchestrator" }
        });
        
        const { prediction } = predictResponse.data;
        console.log("Predicción recibida:", prediction);

        // PASO 3: Responder al Usuario Final
        res.json({
            dataId: dataId,
            prediction: prediction,
            timestamp: new Date().toISOString(),
            status: "success"
        });

    } catch (err) {
        console.error("Error en el flujo:", err.message);
        // Devolver 502 si falla una dependencia externa 
        res.status(502).json({ 
            error: "Error de orquestación", 
            details: err.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Orquestador escuchando en puerto ${PORT}`);
});
