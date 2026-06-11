export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        console.log("--------------------------------------------------");
        console.log("🚀 תחילת תהליך אימות מול שרת Smart Bee");

        const providerClientId = "34c661f4-e7f7-40a2-aedb-b12d6ccbdf60"; 
        const smartBeePassword = process.env.SMARTBEE_PASSWORD; 
        const providerUserToken = process.env.SMARTBEE_TOKEN;   

        if (!smartBeePassword || !providerUserToken) {
            console.error("❌ שגיאה: SMARTBEE_PASSWORD או SMARTBEE_TOKEN חסרים ב-Vercel!");
            return res.status(500).json({ error: "Configuration error: Missing env variables on Vercel." });
        }

        // --------------------------------------------------
        // שלב א': התחברות (Login) - תמיכה גם ב-Body וגם ב-URL למניעת 401
        // --------------------------------------------------
        // שרתי IIS מסוימים דורשים את הנתונים בתוך ה-URL בקשת ה-Authenticate
        const loginUrl = `https://test.smartbee.co.il/api/v1/Login/authenticate?clientId=${providerClientId}&password=${encodeURIComponent(smartBeePassword)}`;
        console.log("📡 שולח בקשת התחברות לשרת...");

        const loginResponse = await fetch(loginUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                "clientId": providerClientId,
                "password": smartBeePassword
            })
        });

        const loginContentType = loginResponse.headers.get("content-type");
        if (!loginResponse.ok || !loginContentType || !loginContentType.includes("application/json")) {
            const errText = await loginResponse.text();
            console.error(`❌ שלב ה-Login נכשל! סטטוס: ${loginResponse.status}`);
            console.error("📄 תוכן שגיאת ה-Login הגולמית:", errText);
            return res.status(loginResponse.status).json({ 
                error: "ההתחברות לשרת הסליקה נכשלה (שגיאת אימות)", 
                status: loginResponse.status,
                raw: errText.substring(0, 500)
            });
        }

        const loginData = await loginResponse.json();
        const jwtToken = loginData.token || loginData.accessToken || loginData.jwtToken || (loginData.data && loginData.data.token);

        if (!jwtToken) {
            console.error("❌ ה-Login עבר אבל לא חזר טוקן JWT. תגובה:", loginData);
            return res.status(500).json({ error: "No JWT token returned from identity provider." });
        }
        console.log("✅ ה-Login בוצע בהצלחה! התקבל טוקן JWT תקין.");

        // --------------------------------------------------
        // שלב ב': הזרקת שדות החובה וביצוע הפקת המסמך
        // --------------------------------------------------
        const cartData = req.body;
        const uniqueMsgId = "LOOP-" + Date.now();

        const finalPayload = {
            ...cartData,
            "providerClientId": providerClientId,
            "providerUserToken": providerUserToken,
            "providerMsgId": uniqueMsgId,
            "providerMsgReferenceId": uniqueMsgId
        };

        const targetUrl = "https://test.smartbee.co.il/api/v1/Documents/create";
        console.log(`📡 שולח בקשה סופית ליצירת מסמך בכתובת: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${jwtToken}` 
            },
            body: JSON.stringify(finalPayload)
        });

        console.log(`📊 סטטוס תגובה מהפקת מסמך: ${response.status}`);

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const rawText = await response.text();
            console.error("❌ הפקת המסמך נכשלה והחזירה HTML:", rawText);
            return res.status(500).json({ error: "Invalid response during document creation", raw: rawText.substring(0, 500) });
        }

        const data = await response.json();

        if (!response.ok) {
            console.error(`❌ שגיאה רשמית מה-API בהפקת מסמך:`, data);
            return res.status(response.status).json({ error: "הפקת המסמך נדחתה", smartBeeResponse: data });
        }

        console.log("🎉 העסקה והמסמך נוצרו בהצלחה מלאה!");
        return res.status(200).json(data);

    } catch (error) {
        console.error("❌ קריסה קריטית במערכת ה-Backend:", error.message);
        return res.status(500).json({ error: "Internal server error", details: error.message });
    }
}
