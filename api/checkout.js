export default async function handler(req, res) {
    // מאפשר רק בקשות מסוג POST מהאתר
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const smartBeeToken = process.env.SMARTBEE_TOKEN;
        
        // הגנה מפני מצב שבו הטוקן לא נטען או חסר בשרת
        if (!smartBeeToken) {
            console.error("❌ Error: SMARTBEE_TOKEN is missing in Vercel Environment Variables!");
            return res.status(500).json({ error: "Configuration error: Token is missing on the server." });
        }

        const cartData = req.body; 
        console.log("📦 Incoming cart data to backend:", JSON.stringify(cartData));

        // פנייה לכתובת דפי התשלום של Smart Bee
        const response = await fetch("https://test.smartbee.co.il/api/v1/payment/create-payment-page", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${smartBeeToken}`
            },
            body: JSON.stringify(cartData)
        });

        // בדיקה אם השרת הגיב בכלל בפורמט JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const rawText = await response.text();
            console.error("❌ Smart Bee returned non-JSON response:", rawText);
            return res.status(500).json({ error: "Invalid response from payment provider", raw: rawText });
        }

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ Smart Bee API returned an error status:", response.status, data);
            return res.status(response.status).json(data);
        }

        // החזרת התשובה התקינה לאתר
        return res.status(200).json(data);

    } catch (error) {
        console.error("❌ Critical Exception in API handler:", error.message, error.stack);
        return res.status(500).json({ error: error.message });
    }
}
