const {ok,created}=require('../../utils/response');const {getPagination}=require('../../utils/pagination');const repo=require('./service.repository');
const list=async(req,res)=>{const p=getPagination(req.query);const r=await repo.list({...p,search:String(req.query.search||'').trim()});return ok(res,r.rows,{page:p.page,pageSize:p.pageSize,total:r.total,totalPages:Math.ceil(r.total/p.pageSize)})};
const create=async(req,res)=>created(res,await repo.create(req.body));
const update=async(req,res)=>ok(res,await repo.update(Number(req.params.id),req.body));
module.exports={list,create,update};
