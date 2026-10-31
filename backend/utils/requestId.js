// Generates prefixed, sequential, collision-checked IDs like APR-000001,
// SCR-000001, HLP-000001. `Model` must have a unique string field `field`.
const generateRequestId = async (Model, field, prefix) => {
  const count = await Model.countDocuments();
  let sequence = count + 1;
  let id = `${prefix}-${String(sequence).padStart(6, '0')}`;

  let existing = await Model.findOne({ [field]: id });
  while (existing) {
    sequence += 1;
    id = `${prefix}-${String(sequence).padStart(6, '0')}`;
    existing = await Model.findOne({ [field]: id });
  }
  return id;
};

module.exports = generateRequestId;
