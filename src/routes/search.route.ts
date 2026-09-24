import { Router } from "express";

import { search } from "../controllers/search.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { searchSchema } from "../schemas/search.schema.js";

const router = Router();

router.get("/", validate(searchSchema), search);

export default router;
