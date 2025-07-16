"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleController = void 0;
const exampleService_1 = require("../../services/exampleService");
class ExampleController {
    static async getExample(req, res) {
        try {
            const result = await ExampleController.exampleService.getExampleMessage();
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: "Internal server error" });
        }
    }
}
exports.ExampleController = ExampleController;
ExampleController.exampleService = new exampleService_1.ExampleService();
