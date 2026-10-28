"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert } from "lucide-react";

const reasons = [
  "I no longer need the service",
  "I have privacy concerns",
  "I have another account",
  "I want to tell you why",
  "Other",
];

const DeleteAccount = () => {
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const subject = "Account Deletion Feedback";
    let body = `Reason: ${selectedReason}\n`;
    if (selectedReason === "I want to tell you why") {
      body += `Details: ${details}\n`;
    }

    const mailtoUri = `mailto:support@mysafari.co.tz?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUri;
  };

  return (
    <div className="min-h-screen bg-[#242a37] flex flex-col">
      {/* Header */}
      <header className="bg-[#FFD428] text-[#333333] py-4 shadow-[var(--ds-shadow-raised)]">
        <div className="container mx-auto px-4 flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-[#333333]" />
          <h1 className="text-3xl font-bold">Delete Your Account</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <div className="bg-[#333333] shadow-[var(--ds-shadow-raised)] rounded-[var(--ds-radius-large)] p-8 max-w-xl w-full text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">
            We're sorry to see you go!
          </h2>
          <p className="text-gray-300 mb-6">
            To delete your MySafari Parcel account, please follow these steps:
          </p>
          <ol className="list-decimal pl-5 mb-6 text-left text-gray-300">
            <li>Login to the MySafari Parcel app on your mobile device.</li>
            <li>
              Tap on the profile pic or name displayed to open {" "}
              <span className="font-medium text-white">
                Menu &rarr;  Settings &rarr; Delete Account
              </span>
              .
            </li>
            <li>
              Follow the on-screen instructions to complete the deletion
              process.
            </li>
          </ol>
          <p className="text-gray-300 mb-6">
            Alternatively, if you are unable to access the app, please contact
            our support team at{" "}
            <a
              href="mailto:support@mysafari.co.tz"
              className="text-[#FFD428] hover:text-[#e0b800]"
            >
              support@mysafari.co.tz
            </a>{" "}
            for assistance.
          </p>
          <form onSubmit={handleSubmit} className="text-left">
            <label className="block mb-2 font-medium text-white">
              Would you like to tell us why you're leaving? (optional)
            </label>
            <div className="space-y-2 mb-4">
              {reasons.map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-2 text-gray-300 hover:text-white"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-[#FFD428] focus:ring-[#FFD428]"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
            {selectedReason === "I want to tell you why" && (
              <textarea
                className="w-full bg-[#242a37] border border-gray-600 rounded-lg p-2 mb-4 text-white placeholder-gray-400"
                rows={3}
                placeholder="Please tell us why you want to delete your account..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                required
              />
            )}
            <button
              type="submit"
              className="w-full mt-2 px-6 py-3 bg-[#FFD428] text-[#333333] font-semibold rounded-lg shadow-[var(--ds-shadow-raised)] hover:bg-[#e0b800] transition"
              disabled={
                selectedReason === "I want to tell you why" &&
                details.trim() === ""
              }
            >
              Submit Feedback (optional)
            </button>
          </form>
          {submitted && (
            <div className="mt-4 text-green-400 text-center">
              Thank you for your feedback!
            </div>
          )}
          <p className="mt-8 text-sm text-gray-400">
            <span className="font-semibold text-red-400">Note:</span> Deleting
            your account is permanent and cannot be undone. All your data will
            be removed from our system.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#333333] text-white py-4">
        <div className="container mx-auto px-4 text-center">
          <p>
            © {new Date().getFullYear()} MySafari Parcel. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default DeleteAccount;
