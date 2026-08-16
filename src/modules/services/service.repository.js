const { query, withTransaction }=require('../../db/repository');
const { sql }=require('../../db/connection');
const { AppError }=require('../../utils/errors');
const list=async({pageSize,offset,search,category})=>{const r=await query(`SELECT s.Id,s.Name,s.Category,s.BaseDurationMinutes,s.RequiresQueue,s.RequiresBooking,s.IsActive,(SELECT COUNT(1) FROM DoctorServices ds WHERE ds.ServiceId=s.Id AND ds.IsActive=1) AS DoctorCount FROM Services s WHERE (@search=N'' OR s.Name LIKE N'%'+@search+N'%' OR s.Category LIKE N'%'+@search+N'%') AND (@category=N'' OR s.Category=@category) ORDER BY s.Category,s.Name OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY; SELECT COUNT_BIG(1) Total FROM Services s WHERE (@search=N'' OR s.Name LIKE N'%'+@search+N'%' OR s.Category LIKE N'%'+@search+N'%') AND (@category=N'' OR s.Category=@category);`,q=>q.input('search',sql.NVarChar(160),search||'').input('category',sql.NVarChar(100),category||'').input('offset',sql.Int,offset).input('pageSize',sql.Int,pageSize));return{rows:r.recordsets[0],total:Number(r.recordsets[1][0].Total)}};
const getById=async(id)=>{const r=await query('SELECT TOP 1 Id,Name,Category,BaseDurationMinutes,RequiresQueue,RequiresBooking,IsActive FROM Services WHERE Id=@id',q=>q.input('id',sql.Int,id));return r.recordset[0]||null};
const create=async(d)=>{const r=await query(`INSERT INTO Services (Name,Category,BaseDurationMinutes,RequiresQueue,RequiresBooking,IsActive) OUTPUT INSERTED.* VALUES (@name,@category,@duration,@requiresQueue,@requiresBooking,@isActive)`,q=>q.input('name',sql.NVarChar(160),d.name).input('category',sql.NVarChar(100),d.category||null).input('duration',sql.Int,d.baseDurationMinutes).input('requiresQueue',sql.Bit,d.requiresQueue!==false).input('requiresBooking',sql.Bit,d.requiresBooking!==false).input('isActive',sql.Bit,d.isActive!==false));return r.recordset[0]};
const update=async(id,d)=>{const r=await query(`UPDATE Services SET Name=@name,Category=@category,BaseDurationMinutes=@duration,RequiresQueue=@requiresQueue,RequiresBooking=@requiresBooking,IsActive=@isActive,UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE Id=@id`,q=>q.input('id',sql.Int,id).input('name',sql.NVarChar(160),d.name).input('category',sql.NVarChar(100),d.category||null).input('duration',sql.Int,d.baseDurationMinutes).input('requiresQueue',sql.Bit,d.requiresQueue!==false).input('requiresBooking',sql.Bit,d.requiresBooking!==false).input('isActive',sql.Bit,d.isActive!==false));return r.recordset[0]||null};
const remove=async(id)=>withTransaction(async(transaction)=>{
  const dependencyResult=await transaction.request().input('id',sql.Int,id).query(`
    SELECT
      (SELECT COUNT_BIG(1) FROM Appointments WHERE ServiceId=@id) AS AppointmentsCount,
      (SELECT COUNT_BIG(1) FROM QueueEntries WHERE ServiceId=@id) AS QueueEntriesCount;
  `);
  const counts=dependencyResult.recordset[0]||{};
  const blockers=[
    ['الحجوزات',counts.AppointmentsCount],
    ['عناصر الطابور',counts.QueueEntriesCount]
  ].filter(([,count])=>Number(count)>0);
  if(blockers.length) throw new AppError(`لا يمكن حذف الخدمة نهائيًا لأنها مرتبطة بـ ${blockers.map(([label,count])=>`${label} (${count})`).join('، ')}. ألغِ السجلات المرتبطة أو عطّل الخدمة.`,409,'SERVICE_HAS_REFERENCES',{blockers});
  const result=await transaction.request().input('id',sql.Int,id).query(`
    DELETE FROM DoctorServices WHERE ServiceId=@id;
    DELETE FROM Pricing WHERE ServiceId=@id;
    DELETE FROM Services OUTPUT DELETED.* WHERE Id=@id;
  `);
  return result.recordsets[result.recordsets.length-1]?.[0]||null;
});
module.exports={list,getById,create,update,remove};
