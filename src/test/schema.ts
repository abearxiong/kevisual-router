import { toJSONSchema, fromJSONSchema } from "@/route.ts";
import { z } from "zod";
const schema = z.object({
  name: z.string(),
  age: z.number(),

});
// console.log("schema", schema);
const jsonSchema = toJSONSchema(schema);
console.log("jsonSchema", jsonSchema);

const newSchema = fromJSONSchema<true>(jsonSchema, { mergeObject: true });
console.log("newSchema shape", Object.keys(newSchema.shape));
console.log('check', newSchema.safeParse({ name: "Alice", age: "30" })?.success);