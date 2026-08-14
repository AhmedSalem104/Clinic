const { created, ok } = require('../../utils/response');
const service = require('./patient-portal.service');

const register = async (req, res) => created(res, await service.register(req.body, req));
const summary = async (req, res) => ok(res, await service.getSummary(req));

module.exports = { register, summary };
