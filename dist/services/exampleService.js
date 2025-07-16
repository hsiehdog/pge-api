"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleService = void 0;
const exampleModel_1 = require("../data/models/exampleModel");
class ExampleService {
    constructor() {
        this.exampleModel = new exampleModel_1.ExampleModel();
    }
    async getExampleMessage() {
        const data = await this.exampleModel.getExampleData();
        return { message: data.message };
    }
}
exports.ExampleService = ExampleService;
