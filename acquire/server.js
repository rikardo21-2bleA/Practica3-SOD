require('dotenv').config();
const express = require('express');
const axios = require('axios'); // No utilizado finalmente por no llamada a API

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => {
    res.json({ status: "ok", service: "acquire" });
});

app.post('/data', async (req, res) => {
    try {
        console.log("Petición de datos (Modo Simulado por error en API Kunna)");

        // Uso de las Features de Trello
        const simulatedFeatures = [1.315, 1.81, 1.27, 8, 0, 9, 30];

        const response = {
            dataId: "demo-backup-" + Date.now(),
            features: simulatedFeatures, 
            featureCount: 7,
            source: "acquire-backup",
            createdAt: new Date().toISOString()
        };

        res.status(201).json(response);
        console.log("Enviando datos:", response);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error interno" });
    }
});

app.listen(PORT, () => {
    console.log(`Servicio ACQUIRE escuchando en puerto ${PORT}`);
});
