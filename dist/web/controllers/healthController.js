"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
class HealthController {
    static getHealth(req, res) {
        res.json({ status: "ok" });
    }
}
exports.HealthController = HealthController;
