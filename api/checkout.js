export default async function handler(req, res) {
    // מאפשר רק בקשות מסוג POST מהאתר שלך
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // משיכת הטוקן המאובטח שהגדרת ב-Vercel
        const smartBeeToken = process.env.SMARTBEE_TOKEN;
        const cartData = req.body; 

        // 🚀 הכתובת המעודכנת ליצירת דף תשלום (Payment Page) לפי ה-Swagger שלהם
        const response = await fetch("https://test.smartbee.co.il/api/v1/payment/create-payment-page", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${smartBeeToken}`
            },
            body: JSON.stringify(cartData) // מעביר את נתוני סל הקניות הדינמיים
        });

        const data = await response.json();

        // אם השרת של Smart Bee מחזיר שגיאה (למשל סטטוס 400), נדפיס אותה ב-Logs של Vercel כדי לראות מה חסר
        if (!response.ok) {
            console.error("❌ Smart Bee API Error:", data);
            return res.status(response.status).json(data);
        }

        // מחזירים את התשובה התקינה (הכוללת את קישור דף התשלום) חזרה לאתר שלך
        return res.status(200).json(data);

    } catch (error) {
        console.error("❌ Server Error in API handler:", error);
        return res.status(500).json({ error: error.message });
    }
}
