exports.generateRefId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let ref = "";
  for (let i = 0; i < 10; i++) ref += chars.charAt(Math.floor(Math.random() * chars.length));
  return ref;
};
