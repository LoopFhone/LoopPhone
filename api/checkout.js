export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        console.log("--------------------------------------------------");
        console.log("🚀 תחילת תהליך הפקת מסמך ב-Backend");

        const smartBeeToken = process.env.SMARTBEE_TOKEN;
        if (!smartBeeToken) {
            console.error("❌ שגיאה: SMARTBEE_TOKEN חסר ב-Vercel!");
            return res.status(500).json({ error: "Configuration error: Token is missing on the server." });
        }

        const cartData = req.body; 
        console.log("📦 הנתונים שנשלחים לסמארט בי:", JSON.stringify(cartData));

        // 🚀 הכתובת הרשמית היחידה שקיימת בתיעוד שלכם!
        const targetUrl = "https://test.smartbee.co.il/api/v1/Documents/create";

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${smartBeeToken}`
            },
            body: JSON.stringify(cartData)
        });

        console.log(`📊 סטטוס תגובה מסמארט בי: ${response.status}`);

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const rawText = await response.text();
            console.error("❌ השרת לא החזיר JSON:", rawText);
            return res.status(500).json({ error: "Invalid response from provider", raw: rawText });
        }

        const data = await response.json();

        if (!response.ok) {
            console.error(`❌ שגיאת API (קוד ${response.status}):`, data);
            return res.status(response.status).json({ error: "חברת הסליקה סירבה לבקשה", smartBeeResponse: data });
        }

        console.log("✅ המסמך/העסקה נוצרו בהצלחה!");
        return res.status(200).json(data);

    } catch (error) {
        console.error("❌ קריסה בשרת:", error.message);
        return res.status(500).json({ error: "Internal server error", details: error.message });
    }
}
