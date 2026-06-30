require("dotenv").config({ path: ".env" });
const axios = require("axios");

async function fetchModels() {
  try {
    const url = (process.env.OLLAMA_BASE_URL || "https://ollama.com/v1") + "/models";
    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`
      }
    });
    console.log("Available models:");
    const models = res.data.data;
    if (models && models.length > 0) {
      models.forEach(m => console.log(m.id));
    } else {
      console.log(res.data);
    }
  } catch (err) {
    console.log("Error fetching models:", err.response ? err.response.data : err.message);
  }
}

fetchModels();
