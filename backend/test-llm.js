require("dotenv").config({ path: ".env" });
const { ChatOpenAI } = require("@langchain/openai");

async function testModel(modelName) {
  try {
    const llm = new ChatOpenAI({
      apiKey: process.env.OLLAMA_API_KEY,
      model: modelName,
      configuration: {
        baseURL: process.env.OLLAMA_BASE_URL || "https://ollama.com/v1",
      },
    });
    console.log(`Testing model: ${modelName}`);
    const res = await llm.invoke("Hello");
    console.log("Success:", res.content);
  } catch (err) {
    console.log(`Error testing ${modelName}:`, err.message);
  }
}

testModel("qwen3-coder-next").then(() => testModel("gemma4:31b-cloud"));
