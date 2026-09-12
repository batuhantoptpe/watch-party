import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";

const templatePath = fileURLToPath(new URL("../views/invite.html", import.meta.url));

export function inviteRoute(req: Request, res: Response): void {
  const template = readFileSync(templatePath, "utf-8");
  const code = req.params.code.toUpperCase();
  res.type("html").send(template.replaceAll("__ROOM_CODE__", code));
}
