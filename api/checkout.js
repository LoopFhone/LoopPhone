export default async function handler(req, res) {
    // מאפשר רק בקשות מסוג POST מהאתר שלך
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Vercel מושך אוטומטית את הטוקן שהגדרת בשלב הקודם
        const smartBeeToken = process.env.SMARTBEE_TOKEN;
        const cartData = req.body; 

        // פנייה מאובטחת לשרת הטסט של Smart Bee
        const response = await fetch("https://test.smartbee.co.il/api/v1/documents/create", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${smartBeeToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(cartData)
        });

        const data = await response.json();

        // מחזירים את התשובה מ-Smart Bee (כמו מספר מסמך או קישור לתשלום) חזרה לאתר
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}