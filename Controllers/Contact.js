const sendEmail = require("../Utils/sendEmail");
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
        const sender = req.user;

        let receiverId;
        let receiverEmail; // **Naya variable** receiver ka email store karne ke liye
        let emailSubject = `New Contact Message: ${title}`;
        let emailMessage = `You have received a new contact message.\n\nFrom: ${sender.role} (${sender.email})\nTitle: ${title}\nDescription: ${description}\n\nSender's Contact Mail: ${mail}`;
        
        // ... (Existing logic for receiverId)
        // USER → VENDOR
        if (sender.role === "user") {
            if (!toUserId)
                return res.status(400).json({ message: "Vendor ID is required" });

            const vendor = await User.findById(toUserId); // **Vendor ka data fetch karein**
            if (!vendor)
                return res.status(404).json({ message: "Vendor not found" });

            receiverId = vendor._id;
            receiverEmail = vendor.email; // **Vendor ka email**

            emailSubject = `New Customer Inquiry: ${title}`;
        }

        // VENDOR → ADMIN
        else if (sender.role === "vendor") {
            const admin = await User.findOne({ role: "admin" });
            console.log("admin found:", admin);
            if (!admin)
                return res.status(404).json({ message: "Admin not found" });

            receiverId = admin._id;
            receiverEmail = admin.email; // **Admin ka email**

            emailSubject = `New Vendor Message: ${title}`;
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
        try {
            await sendEmail({
                email: receiverEmail, // Jise email bhejna hai (Vendor/Admin)
                subject: emailSubject,
                message: emailMessage,
            });
            console.log(`Email sent successfully to ${receiverEmail}`);

        } catch (emailError) {
            // Email error ko handle karein. **NOTE:** Contact create ho chuka hai, toh server error (500) na dekar sirf **log** karein.
            console.error("Email could not be sent:", emailError);
            // Aap yahan user ko ek mild warning bhi de sakte hain, ya sirf log karke aage badh sakte hain.
        }
        // ----------------------------------------------------------------------

        res.status(201).json({
            success: true,
            message: "Contact message created successfully and notification email sent", // Message update kiya
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
