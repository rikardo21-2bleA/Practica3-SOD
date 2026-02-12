const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const ACQUIRE_URL = process.env.ACQUIRE_URL || 'http://acquire:3001';
const PREDICT_URL = process.env.PREDICT_URL || 'http://predict:3002';

console.log('\n=== ORCHESTRATOR INICIADO ===');
console.log('Acquire URL:', ACQUIRE_URL);
console.log('Predict URL:', PREDICT_URL);
console.log('\n');

app.get('/health', (req, res) => {
    res.json({ status: "ok", service: "orchestrator" });
});

// FLUJO COMPLETO
app.post('/run', async (req, res) => {
    try {
        console.log('\n========================================');
        console.log('INICIO FLUJO DE PREDICCIÓN');
        console.log('Timestamp:', new Date().toISOString());
        console.log('========================================\n');

        // PASO 1: OBTENER DATOS DE ACQUIRE
        console.log('PASO 1: Llamando a Acquire...');
        console.log('URL:', `${ACQUIRE_URL}/data`);
        
        const acquireResponse = await axios.post(`${ACQUIRE_URL}/data`, {}, {
            timeout: 15000
        });
        
        const { features, dataId, source } = acquireResponse.data;
        
        if (!features) {
            throw new Error("Acquire no devolvió features");
        }
        
        console.log('Datos recibidos de Acquire');
        console.log('  DataId:', dataId);
        console.log('  Source:', source);
        console.log('  Features:', features);

        // PASO 2: ENVIAR A PREDICT
        console.log('\nPASO 2: Llamando a Predict...');
        console.log('URL:', `${PREDICT_URL}/predict`);
        
        const predictResponse = await axios.post(`${PREDICT_URL}/predict`, {
            features: features,
            meta: { dataId: dataId, source: "orchestrator" }
        }, {
            timeout: 10000
        });
        
        const { prediction, modelVersion } = predictResponse.data;
        
        console.log('Predicción recibida');
        console.log('  Prediction:', prediction);
        console.log('  Model:', modelVersion);

        // PASO 3: RESPUESTA FINAL
        console.log('\n========================================');
        console.log('FLUJO COMPLETADO EXITOSAMENTE');
        console.log('========================================\n');

        res.json({
            success: true,
            dataId: dataId,
            features: features,
            prediction: prediction,
            source: source,
            modelVersion: modelVersion,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('\nERROR EN FLUJO:');
        console.error('Mensaje:', err.message);
        
        if (err.code === 'ECONNREFUSED') {
            console.error('No se pudo conectar al servicio');
            console.error('URL intentada:', err.config?.url);
        }
        
        console.log('\n');
        
        res.status(502).json({ 
            success: false,
            error: "Error en orquestación", 
            details: err.message,
            service: err.config?.url || 'unknown'
        });
    }
});

app.listen(PORT, () => {
    console.log(`ORCHESTRATOR en puerto ${PORT}\n`);
});
