const dotenv = require('dotenv')
const express = require('express');
const mysql = require('mysql2');

dotenv.config();
const app = express();
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

app.post('/api/schools/addSchool', (req, res) => {
    const { name, address, latitude, longitude } = req.body;

    // Validation
    if (!name || !address || typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    const query = `INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)`;
    db.execute(query, [name, address, latitude, longitude], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        res.status(201).json({ message: 'School added successfully', schoolId: results.insertId });
    });
});

app.get('/api/schools/listSchools', (req, res) => {

    const { latitude, longitude } = req.query;

    // Regular expression to validate that the input is a valid number (allows decimals)
    const isValidCoordinate = (value) => /^-?\d+(\.\d+)?$/.test(value);

    // Check if latitude and longitude are valid numbers
    if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
        return res.status(400).json({ error: 'Invalid location data' });
    }

    // Parse the strings to floats
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    // Further validation to ensure the values are within valid ranges
    if (userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
        return res.status(400).json({ error: 'Latitude or Longitude out of range' });
    }

    const query = `SELECT id, name, address, latitude, longitude FROM schools`;
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', details: err.message });
        }

        // Calculate distances and sort
        results.forEach((school) => {
            const distance = calculateDistance(userLat, userLon, school.latitude, school.longitude);
            school.distance = distance;
        });

        results.sort((a, b) => a.distance - b.distance);

        res.json(results);
    });
});

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});