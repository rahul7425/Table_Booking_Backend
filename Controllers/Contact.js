const Contact = require("../Models/ContactModel");

exports.createContact = async (req, res) => {
  try {
    const { title, description, mail } = req.body;
    const role = req.user.role; // 🔹 From JWT decoded token

    const newContact = await Contact.create({
      title,
      description,
      mail,
      role,
    });

    res.status(201).json({
      success: true,
      message: "Contact message created successfully",
      contact: newContact,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: contacts.length, contacts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact)
      return res.status(404).json({ message: "Contact message not found" });

    res.status(200).json({ success: true, contact });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!contact)
      return res.status(404).json({ message: "Contact message not found" });

    res.status(200).json({
      success: true,
      message: "Contact message updated successfully",
      contact,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact)
      return res.status(404).json({ message: "Contact message not found" });

    res.status(200).json({
      success: true,
      message: "Contact message deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
