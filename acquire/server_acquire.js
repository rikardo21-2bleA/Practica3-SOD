const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const SensorData = require('./models/SensorData');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// --- CONEXIÓN A MONGODB ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongo:27017/acquire_db';

mongoose.connect(MONGO_URI)
    .then(() => console.log('Acquire conectado a MongoDB'))
    .catch(err => console.error('Error MongoDB:', err.message));

// --- CONFIGURACIÓN KUNNA ---
const KUNNA_TOKEN = process.env.KUNNA_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Njk3NjgxMjF9.aPAPuxL3U6_AFlcZnme7Hf_n6lWQU8hYc8ZTElYm4Kg";
const KUNNA_URL = `https://openapi.kunna.es/data/${KUNNA_TOKEN}`;
const UID = process.env.KUNNA_UID || "MLU00360002";

console.log('\n=== ACQUIRE INICIADO ===');
console.log('UID Kunna:', UID);

// --- FUNCIÓN PARA GENERAR DATOS SIMULADOS ---
function generarDatosSimulados() {
    console.log('Generando datos SIMULADOS (Kunna no disponible)');
    
    // Generar 7 valores aleatorios realistas para energía
    const features = [
        Math.random() * 100 + 50,   // 50-150
        Math.random() * 200 + 100,  // 100-300
        Math.random() * 150 + 75,   // 75-225
        Math.random() * 180 + 90,   // 90-270
        Math.random() * 120 + 60,   // 60-180
        Math.random() * 160 + 80,   // 80-240
        Math.random() * 140 + 70    // 70-210
    ];
    
    return features.map(f => parseFloat(f.toFixed(2)));
}

// --- ENDPOINTS ---

app.get('/health', (req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({ 
        status: "ok",
        service: "acquire",
        mongodb: mongoStatus
    });
});

app.post('/data', async (req, res) => {
    const timeEnd = new Date();
    const timeStart = new Date();
    timeStart.setDate(timeEnd.getDate() - 3);

    let features = [];
    let source = "";

    try {
        console.log('\n=== PETICIÓN /data ===');
        console.log('Timestamp:', new Date().toISOString());

        // INTENTAR OBTENER DATOS REALES DE KUNNA
        try {
            const kunnaBody = {
                "time_start": timeStart.toISOString(),
                "time_end": timeEnd.toISOString(),
                "filters": [
                    { "filter": "name", "values": ["1d"] },
                    { "filter": "uid", "values": [UID] }
                ],
                "limit": 100,
                "count": false,
                "order": "DESC"
            };

            console.log('Intentando conectar a Kunna...');
            
            const response = await axios.post(KUNNA_URL, kunnaBody, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000
            });

            if (response.status === 200 && response.data.result?.values?.length > 0) {
                // ÉXITO: Datos reales de Kunna
                const rawValues = response.data.result.values[0];
                features = rawValues.filter(val => typeof val === 'number').slice(0, 7);
                
                while (features.length < 7) features.push(0);
                
                source = "acquire-kunna-REAL";
                console.log('Datos REALES obtenidos de Kunna');
                console.log('Features:', features);
            } else {
                throw new Error('Respuesta de Kunna sin datos');
            }

        } catch (kunnaError) {
            // SI KUNNA FALLA, USAR DATOS SIMULADOS
            console.log('Kunna no disponible:', kunnaError.message);
            features = generarDatosSimulados();
            source = "acquire-SIMULADO";
            console.log('✓ Usando datos SIMULADOS');
            console.log('Features:', features);
        }

        // --- GUARDAR EN MONGODB ---
        const nuevoDato = new SensorData({
            features: features,
            featureCount: 7,
            scalerVersion: "v1",
            createdAt: new Date(),
            kunnaMeta: { uid: UID, name: "1d" },
            fetchMeta: { timeStart, timeEnd },
            source: source
        });

        await nuevoDato.save();
        console.log('Guardado en MongoDB:', nuevoDato._id);

        // RESPUESTA AL ORQUESTADOR
        res.status(201).json({
            dataId: nuevoDato._id.toString(),
            features: features,
            source: source,
            timestamp: nuevoDato.createdAt
        });

        console.log('Respuesta enviada\n');

    } catch (error) {
        console.error('ERROR:', error.message);
        res.status(500).json({ 
            error: "Error interno en acquire",
            details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`ACQUIRE en puerto ${PORT}\n`);
});
