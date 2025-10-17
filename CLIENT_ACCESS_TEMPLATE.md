# 🌐 Insurance Brokerage System - UAT Access

Dear [Client Name],

Your Insurance Brokerage System is now deployed and ready for testing!

---

## 🔗 Access Details

**Application URL:**  
https://your-app-name.vercel.app

**Test Credentials:**  
Email: `testuser@insurancebrokerage.com`  
Password: `Test@123456`

**Or create your own account:**  
Click "Register" on the login page

---

## 🚀 Getting Started

1. **Open the application**  
   Click the URL above

2. **Login or Register**  
   Use the test credentials or create your own account

3. **Start testing**  
   Begin with creating a client, then explore other features

---

## ✅ Features to Test

### Core Modules
- ✓ **Clients** - Manage company and individual clients
- ✓ **Insurers** - Manage insurance companies
- ✓ **Agents** - Manage insurance agents
- ✓ **Banks** - Manage bank accounts
- ✓ **LOBs** - Setup Lines of Business (Motor, Fire, etc.)
- ✓ **Policies** - Create and manage insurance policies
- ✓ **Credit Notes** - Generate credit notes with auto-calculations
- ✓ **Debit Notes** - Generate debit notes
- ✓ **Endorsements** - Policy modifications

### Key Capabilities
- ✓ Auto-generated codes (e.g., MEIBL/CL/2025/IND/00001)
- ✓ Automatic financial calculations
- ✓ Complete workflow from client to credit note
- ✓ Real-time validation
- ✓ Audit trail for all changes
- ✓ Mobile responsive design

---

## 🧪 Quick Test Workflow

### 1. Create a Client
- Go to **Clients** menu
- Click **Add Client**
- Choose type: **Individual** (no CAC/TIN required) or **Company** (requires CAC/TIN)
- Fill in details
- **Result:** Auto-generated code like `MEIBL/CL/2025/IND/00001`

### 2. Create an Insurer
- Go to **Insurers** menu
- Add insurance company details
- **Result:** Code like `MEIBL/IN/2025/00001`

### 3. Setup LOB (Line of Business)
- Go to **LOBs** menu
- Add: Motor, Fire, Marine, etc.
- Set brokerage percentage and VAT

### 4. Create a Policy
- Go to **Policies** menu
- Select client, insurer, and LOB
- Enter sum insured, premium, and dates
- **Result:** Auto policy number + calculated values

### 5. Generate Credit Note
- Go to **Notes** menu
- Select type: **Credit Note (CN)**
- Choose policy
- System calculates everything automatically
- **Result:** `CN/2025/000001`

---

## 📊 What to Test

### Data Entry
- [ ] Create multiple clients (both Individual and Company types)
- [ ] Add various insurers
- [ ] Setup different LOBs
- [ ] Create policies with different parameters

### Calculations
- [ ] Verify premium calculations
- [ ] Check brokerage calculations
- [ ] Validate VAT calculations
- [ ] Test commission distributions

### Auto-Generation
- [ ] Client codes generate correctly
- [ ] Policy numbers are sequential
- [ ] CN/DN numbers are unique
- [ ] No gaps in numbering

### Validation
- [ ] Required fields are enforced
- [ ] Email format validation
- [ ] Date range validation
- [ ] Numeric field validation

### User Experience
- [ ] Navigation is intuitive
- [ ] Forms are easy to use
- [ ] Error messages are clear
- [ ] Success notifications work
- [ ] Mobile responsive

---

## 🐛 How to Report Issues

If you encounter any problems:

1. **Take a screenshot** of the issue
2. **Describe** what you were trying to do
3. **Note** any error messages
4. **Send to:** your.email@company.com

**Please include:**
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Browser used (Chrome, Firefox, Safari, etc.)

---

## 📞 Support

**Email:** your.email@company.com  
**Response Time:** Within 24 hours  
**Availability:** 24/7 (system is always online)

---

## 🔒 Security

- ✓ HTTPS enabled (secure connection)
- ✓ Data encrypted in transit and at rest
- ✓ Session-based authentication
- ✓ Automatic logout after inactivity
- ✓ Secure password requirements

---

## ⏰ Testing Period

The UAT environment is available **24/7** for your testing. Take your time to thoroughly test all features.

---

## 📝 Feedback

Your feedback is valuable! Please share:
- What works well
- What could be improved
- Any missing features
- Suggestions for enhancements

---

## 🎯 Next Steps

After UAT testing is complete:
1. Review and consolidate feedback
2. Address any issues found
3. Plan for production deployment
4. Schedule training sessions (if needed)

---

**Thank you for testing the Insurance Brokerage System!**

We look forward to your feedback.

Best regards,  
[Your Name]  
[Your Company]  
[Your Contact Information]

---

*This is a UAT (User Acceptance Testing) environment. All data is for testing purposes only.*
