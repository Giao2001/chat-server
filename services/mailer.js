const sgMail = require("@sendgrid/mail");

const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });
// console.log(process.env.SGKEY);

sgMail.setApiKey(process.env.Key1);

const sendSGMail = async ({ to, sender, subject, html, text, attachments }) => {
    try {
        const from = sender || "baduy.work@gmail.com";

        const msg = {
            to: to, // Change to your recipient
            from: from, // Change to your verified sender
            subject: subject,
            // text: text,
            html: html,
            attachments,
        };

        return sgMail.send(msg);
    } catch (error) {
        console.log(error);
    }
};

exports.sendEmail = async (args) => {
    if (!process.env.NODE_ENV === "development") {
        return Promise.resolve();
    } else {
        return sendSGMail(args);
    }
};
