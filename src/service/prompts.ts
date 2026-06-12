import type OpenAI from "openai";

export function describeImagePrompt(image: Buffer, mimeType: string = 'image/png'): OpenAI.Responses.ResponseInput {
  const base64 = image.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  return [
    { role: 'system', content: 'The user will provide an image. You are to describe this image in great detail, providing no added commentary- just a perfect description of the image.' },
    { role: 'user', content: [
      { type: 'input_image', image_url: dataUri, detail: 'auto' }
    ] }
  ];
}

export function improveImageDescriptionPrompt(baseDesc: string, context: string[]): OpenAI.Responses.ResponseInput {
  return [
    { role: 'system', content: `The user will provide a BASE_DESCRIPTION and CONTEXT.
BASE_DESCRIPTION is an AI-generated description of an image.
CONTEXT is some possibly useful context involving the image.
You are to determine if the CONTEXT is relevant to the BASE_DESCRIPTION, and include it in the description naturally if it is relevant.
Do not provide any additional commentary.`},
    { role: 'user', content: `BASE_DESCRIPTION:\n\n\n${baseDesc}\n\n\n`},
    { role: 'user', content: `CONTEXT:\n\n\n${context.join('\n\n\n')}`},
  ];
}