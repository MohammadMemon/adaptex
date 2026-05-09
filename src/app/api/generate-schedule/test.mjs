import { GoogleGenerativeAI } from "@google/generative-ai";

async function listModels() {
  const genAI = new GoogleGenerativeAI("AIzaSyBxTA0r4W8-jzpsURYywuC7eB0zk-bfucA");
  try {
    const models = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyBxTA0r4W8-jzpsURYywuC7eB0zk-bfucA');
    const data = await models.json();
    console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
