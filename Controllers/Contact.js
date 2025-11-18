const Contact = require("../Models/ContactModel");
const User = require("../Models/UserModel");

// exports.createContact = async (req, res) => {
//   try {
//     const { title, description, mail } = req.body;
//     const role = req.user.role;

//     const newContact = await Contact.create({
//       title,
//       description,
//       mail,
//       role,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Contact message created successfully",
//       contact: newContact,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

exports.createContact = async (req, res) => {
  try {
    const { title, description, mail, toUserId } = req.body;
    const sender = req.user; // logged-in user

    let receiverId;

    // USER → VENDOR
    if (sender.role === "user") {
      if (!toUserId)
        return res.status(400).json({ message: "Vendor ID is required" });

      receiverId = toUserId;
    }

    // VENDOR → ADMIN
    else if (sender.role === "vendor") {
      const admin = await User.findOne({ role: "admin" });

      if (!admin)
        return res.status(404).json({ message: "Admin not found" });

      receiverId = admin._id;
    }

    // ADMIN should not send messages
    else {
      return res
        .status(403)
        .json({ message: "Admin cannot send contact messages" });
    }

    const newContact = await Contact.create({
      title,
      description,
      mail,
      from: sender._id,
      to: receiverId,
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
    const contacts = await Contact.find()
      .populate("from", "name email role")
      .populate("to", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: contacts.length,
      contacts
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



exports.getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate("from", "name email role")
      .populate("to", "name email role");

    if (!contact)
      return res.status(404).json({ message: "Contact message not found" });

    res.status(200).json({
      success: true,
      contact
    });

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
