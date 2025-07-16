"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const health_1 = __importDefault(require("./web/routes/health"));
const example_1 = __importDefault(require("./web/routes/example"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Routes
app.use("/health", health_1.default);
app.use("/example", example_1.default);
exports.default = app;
