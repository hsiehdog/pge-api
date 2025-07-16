"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleModel = void 0;
class ExampleModel {
    async getExampleData() {
        // In a real application, this would fetch data from a database
        // For now, we'll return mock data
        return { message: "Example route works!" };
    }
}
exports.ExampleModel = ExampleModel;
