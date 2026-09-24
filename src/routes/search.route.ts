import { Router } from "express";

import { search } from "../controllers/search.controller.js";
import { validateQuery } from "../middlewares/validate.middleware.js";
import { searchSchema } from "../schemas/search.schema.js";

const router = Router();

router.get("/", validateQuery(searchSchema), search);

export default router;
