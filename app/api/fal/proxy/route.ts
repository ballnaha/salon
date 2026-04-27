import { createRouteHandler } from "@fal-ai/server-proxy/nextjs";

export const { GET, POST, PUT } = createRouteHandler({
    allowedEndpoints: [
        "openai/gpt-image-2/edit", 
        // ถ้ามีการใช้ Model อื่นในอนาคต ให้มาเพิ่มชื่อที่นี่ครับ
      ],
});