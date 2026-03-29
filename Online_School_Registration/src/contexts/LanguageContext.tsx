import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'rw';

interface Translations {
  [key: string]: {
    en: string;
    rw: string;
  };
}

export const translations: Translations = {
  // Navigation
  'nav.home': { en: 'Home', rw: 'Ahabanza' },
  'nav.about': { en: 'About OSR', rw: 'Ibyerekeye OSR' },
  'nav.schools': { en: 'Find Schools', rw: 'Shakisha Amashuri' },
  'nav.signin': { en: 'Sign In', rw: 'Injira' },
  'nav.signup': { en: 'Sign Up', rw: 'Iyandikishe' },
  'nav.dashboard': { en: 'Dashboard', rw: 'Ibikubiyemo' },
  'nav.signout': { en: 'Sign Out', rw: 'Sohoka' },
  
  // Hero Section
  'hero.title': { en: 'Simplifying School Registration in Rwanda', rw: 'Korohereza Iyandikisha ry\'Amashuri mu Rwanda' },
  'hero.subtitle': { en: 'Connect parents with schools. Register your child with ease. Track applications in real-time.', rw: 'Huza ababyeyi n\'amashuri. Andikisha umwana wawe byoroshye. Kurikirana inyandiko mu gihe nyacyo.' },
  'hero.cta.parent': { en: 'Register as Parent', rw: 'Iyandikishe nk\'Umubyeyi' },
  'hero.cta.school': { en: 'Register Your School', rw: 'Andikisha Ishuri Ryawe' },
  
  // About Section
  'about.title': { en: 'About Online School Registration', rw: 'Ibyerekeye Iyandikisha ry\'Amashuri kuri Interineti' },
  'about.description': { en: 'OSR Rwanda is a digital platform designed to streamline the school registration process for parents and schools across Rwanda. Our mission is to make education more accessible by connecting families with the right schools.', rw: 'OSR Rwanda ni urubuga rwa digitale rwashyizweho kugira ngo runonosore uburyo bwo kwandikisha amashuri ku babyeyi n\'amashuri mu Rwanda hose. Intego yacu ni ukugira uburezi burushaho kuboneka mu guhuza imiryango n\'amashuri akwiriye.' },
  'about.feature1.title': { en: 'Easy Registration', rw: 'Iyandikisha Ryoroshye' },
  'about.feature1.desc': { en: 'Complete your child\'s school registration online in minutes', rw: 'Uzuza iyandikisha ry\'umwana wawe kuri interineti mu minota mike' },
  'about.feature2.title': { en: 'School Discovery', rw: 'Gushaka Amashuri' },
  'about.feature2.desc': { en: 'Browse and filter schools by location, grades, and more', rw: 'Shakisha kandi uhitemo amashuri ukurikije ahantu, amasomo, n\'ibindi' },
  'about.feature3.title': { en: 'Track Applications', rw: 'Kurikirana Inyandiko' },
  'about.feature3.desc': { en: 'Monitor your application status in real-time', rw: 'Kurikirana uko inyandiko zawe zihagaze mu gihe nyacyo' },
  'about.feature4.title': { en: 'Upload Payment Proof', rw: 'Shyiraho Icyemezo cy\'Ubwishyu' },
  'about.feature4.desc': { en: 'Upload your payment proof online without visiting the school in person', rw: 'Shyiraho icyemezo cy\'ubwishyu kuri interineti utajya ku ishuri' },
  
  // School Discovery
  'schools.title': { en: 'Find the Perfect School', rw: 'Shakisha Ishuri Rikwiriye' },
  'schools.subtitle': { en: 'Browse schools across Rwanda by district and sector', rw: 'Shakisha amashuri mu Rwanda hose ukurikije akarere n\'umurenge' },
  'schools.filter.province': { en: 'Province', rw: 'Intara' },
  'schools.filter.district': { en: 'District', rw: 'Akarere' },
  'schools.filter.sector': { en: 'Sector', rw: 'Umurenge' },
  'schools.filter.search': { en: 'Search schools...', rw: 'Shakisha amashuri...' },
  'schools.viewDetails': { en: 'View Details', rw: 'Reba Ibisobanuro' },
  'schools.apply': { en: 'Apply Now', rw: 'Saba Ubu' },
  
  // Auth
  'auth.signin.title': { en: 'Welcome Back', rw: 'Murakaza Neza' },
  'auth.signin.subtitle': { en: 'Sign in to your OSR account', rw: 'Injira kuri konti yawe ya OSR' },
  'auth.signup.title': { en: 'Create Account', rw: 'Fungura Konti' },
  'auth.signup.subtitle': { en: 'Join OSR Rwanda today', rw: 'Injira muri OSR Rwanda uyu munsi' },
  'auth.email': { en: 'Email Address', rw: 'Imeyili' },
  'auth.password': { en: 'Password', rw: 'Ijambobanga' },
  'auth.fullname': { en: 'Full Name', rw: 'Amazina Yose' },
  'auth.phone': { en: 'Phone Number', rw: 'Nimero ya Telefoni' },
  'auth.role': { en: 'I am a...', rw: 'Ndi...' },
  'auth.role.parent': { en: 'Parent', rw: 'Umubyeyi' },
  'auth.role.school': { en: 'School Administrator', rw: 'Umuyobozi w\'Ishuri' },
  'auth.submit.signin': { en: 'Sign In', rw: 'Injira' },
  'auth.submit.signup': { en: 'Create Account', rw: 'Fungura Konti' },
  'auth.noAccount': { en: 'Don\'t have an account?', rw: 'Ntufite konti?' },
  'auth.hasAccount': { en: 'Already have an account?', rw: 'Usanzwe ufite konti?' },
  'auth.confirmPassword': { en: 'Confirm Password', rw: 'Emeza Ijambobanga' },
  
  // School Registration
  'auth.school.details': { en: 'School Details', rw: 'Amakuru y\'Ishuri' },
  'auth.school.name': { en: 'School Name', rw: 'Izina ry\'Ishuri' },
  'auth.school.staffRole': { en: 'Your Role in School', rw: 'Umwanya Wawe mu Ishuri' },
  'auth.school.qualifications': { en: 'Qualifications', rw: 'Impamyabumenyi' },
  'auth.school.province': { en: 'Province', rw: 'Intara' },
  'auth.school.district': { en: 'District', rw: 'Akarere' },
  'auth.school.sector': { en: 'Sector', rw: 'Umurenge' },
  'auth.school.logo': { en: 'School Logo', rw: 'Ikimenyetso cy\'Ishuri' },
  
  // Dashboard
  'dashboard.welcome': { en: 'Welcome', rw: 'Murakaza neza' },
  'dashboard.subtitle': { en: 'Manage your children\'s school registrations', rw: 'Genzura iyandikisha ry\'abana bawe' },
  'dashboard.registerStudent': { en: 'Register New Student', rw: 'Andikisha Umunyeshuri Mushya' },
  'dashboard.registerStudentDesc': { en: 'Enroll a new child in a school', rw: 'Andikisha umwana mushya mu ishuri' },
  'dashboard.startRegistration': { en: 'Start Registration', rw: 'Tangira Iyandikisha' },
  'dashboard.transferStudent': { en: 'Transfer Student', rw: 'Imura Umunyeshuri' },
  'dashboard.transferStudentDesc': { en: 'Move a child to a different school', rw: 'Imura umwana mu ishuri ritandukanye' },
  'dashboard.startTransfer': { en: 'Start Transfer', rw: 'Tangira Kwimura' },
  'dashboard.payment': { en: 'Payment Proof', rw: 'Icyemezo cy\'Ubwishyu' },
  'dashboard.paymentDesc': { en: 'Upload payment proof for school fees', rw: 'Shyiraho icyemezo cy\'ubwishyu bw\'amafaranga y\'ishuri' },
  'dashboard.submitPayment': { en: 'Submit Payment', rw: 'Ohereza Kwishyura' },
  'dashboard.studentHub': { en: 'Student Hub', rw: 'Ikigo cy\'Abanyeshuri' },
  'dashboard.studentHubDesc': { en: 'View and manage your children', rw: 'Reba kandi ugenzure abana bawe' },
  'dashboard.viewStudents': { en: 'View Students', rw: 'Reba Abanyeshuri' },
  
  // Common
  'common.back': { en: 'Back', rw: 'Subira Inyuma' },
  'common.submitting': { en: 'Submitting...', rw: 'Biroherezwa...' },
  
  // Register Form
  'register.title': { en: 'Register New Student', rw: 'Andikisha Umunyeshuri Mushya' },
  'register.description': { en: 'Fill in your child\'s details to register them at a school', rw: 'Uzuza amakuru y\'umwana wawe kugira ngo umwandikishe mu ishuri' },
  'register.studentName': { en: 'Student Full Name', rw: 'Amazina Yose y\'Umunyeshuri' },
  'register.studentNamePlaceholder': { en: 'Enter student\'s full name', rw: 'Andika amazina yose y\'umunyeshuri' },
  'register.dob': { en: 'Date of Birth', rw: 'Itariki y\'Amavuko' },
  'register.motherName': { en: 'Mother\'s Name', rw: 'Izina rya Mama' },
  'register.motherNamePlaceholder': { en: 'Enter mother\'s full name', rw: 'Andika amazina yose ya mama' },
  'register.fatherName': { en: 'Father\'s Name', rw: 'Izina rya Papa' },
  'register.fatherNamePlaceholder': { en: 'Enter father\'s full name', rw: 'Andika amazina yose ya papa' },
  'register.school': { en: 'Select School', rw: 'Hitamo Ishuri' },
  'register.selectSchool': { en: 'Choose a school', rw: 'Hitamo ishuri' },
  'register.grade': { en: 'Grade/Class', rw: 'Icyiciro/Ishami' },
  'register.selectGrade': { en: 'Select grade', rw: 'Hitamo icyiciro' },
  'register.selectSchoolPlaceholder': { en: 'Choose a school', rw: 'Hitamo ishuri' },
  'register.gradePlaceholder': { en: 'Select grade/class', rw: 'Hitamo icyiciro/ishami' },
  'register.transcript': { en: 'Upload Transcripts (Optional)', rw: 'Shyiraho Impapuro z\'Amanota (Ntibisabwa)' },
  'register.motherPhone': { en: "Mother's Phone Number", rw: "Nimero ya Telefoni ya Mama" },
  'register.fatherPhone': { en: "Father's Phone Number", rw: "Nimero ya Telefoni ya Papa" },
  'register.transcriptHint': { en: 'Upload PDF, JPG, or PNG (max 5MB)', rw: 'Shyiraho PDF, JPG, cyangwa PNG (ntarengwa 5MB)' },
  'register.submit': { en: 'Register Student', rw: 'Andikisha Umunyeshuri' },
  'register.success': { en: 'Registration Successful!', rw: 'Iyandikisha Ryagenze Neza!' },
  'register.successDesc': { en: 'Your child has been registered. Await school approval.', rw: 'Umwana wawe yandikishijwe. Tegereza kwemezwa n\'ishuri.' },
  'register.error': { en: 'Registration Failed', rw: 'Iyandikisha Ryanze' },
  'register.parentPhone': { en: 'Parent Phone Number', rw: 'Nimero ya Telefoni y\'Umubyeyi' },
  'register.parentPhonePlaceholder': { en: 'e.g., 0788123456', rw: 'urugero, 0788123456' },
  'register.parentEmail': { en: 'Parent Email (Optional)', rw: 'Imeyili y\'Umubyeyi (Ntibisabwa)' },
  'register.parentEmailPlaceholder': { en: 'parent@email.com', rw: 'umubyeyi@email.com' },
  
  // Transfer Form
  'transfer.title': { en: 'Transfer Student', rw: 'Imura Umunyeshuri' },
  'transfer.description': { en: 'Transfer your child to a new school', rw: 'Imura umwana wawe mu ishuri rishya' },
  'transfer.selectStudent': { en: 'Select Student', rw: 'Hitamo Umunyeshuri' },
  'transfer.selectStudentPlaceholder': { en: 'Choose a child to transfer', rw: 'Hitamo umwana wo kwimura' },
  'transfer.previousSchool': { en: 'Previous School Name', rw: 'Izina ry\'Ishuri rya Mbere' },
  'transfer.previousSchoolPlaceholder': { en: 'Enter the name of the previous school', rw: 'Andika izina ry\'ishuri rya mbere' },
  'transfer.newSchool': { en: 'New School', rw: 'Ishuri Rishya' },
  'transfer.selectNewSchool': { en: 'Choose the new school', rw: 'Hitamo ishuri rishya' },
  'transfer.reason': { en: 'Reason for Transfer', rw: 'Impamvu yo Kwimura' },
  'transfer.reasonPlaceholder': { en: 'Explain why you are transferring your child', rw: 'Sobanura impamvu wimura umwana wawe' },
  'transfer.transcripts': { en: 'Previous School Transcripts', rw: 'Impapuro z\'Amanota z\'Ishuri rya Mbere' },
  'transfer.filesSelected': { en: 'files selected', rw: 'dosiye zahiswemo' },
  'transfer.transcriptsHint': { en: 'Upload all previous school transcripts (PDF, JPG, PNG)', rw: 'Shyiraho impapuro zose z\'amanota z\'ishuri rya mbere' },
  'transfer.submit': { en: 'Submit Transfer Request', rw: 'Ohereza Icyifuzo cyo Kwimura' },
  'transfer.success': { en: 'Transfer Request Submitted!', rw: 'Icyifuzo cyo Kwimura Cyoherejwe!' },
  'transfer.successDesc': { en: 'Your transfer request is pending approval.', rw: 'Icyifuzo cyawe cyo kwimura gitegereje kwemezwa.' },
  'transfer.error': { en: 'Transfer Failed', rw: 'Kwimura Byanze' },
  
  // Payment Form
  'payment.title': { en: 'Pay School Fees', rw: 'Ishyura Amafaranga y\'Ishuri' },
'payment.description': { en: 'Upload your payment proof', rw: 'Shyiraho icyemezo cy\'ubwishyu bwawe' },
  'payment.uploadProofDesc': { en: 'Upload proof of payment for your child\'s school fees', rw: 'Shyiraho icyemezo cy\'ubwishyu bw\'amafaranga y\'ishuri ry\'umwana wawe' },
  'payment.descriptionLabel': { en: 'Description (Optional)', rw: 'Ibisobanuro (Ntibisabwa)' },
  'payment.descriptionPlaceholder': { en: 'e.g., Term 1 school fees', rw: 'urugero, Amafaranga y\'ishuri igihembwe cya 1' },
  'payment.selectStudent': { en: 'Select Student', rw: 'Hitamo Umunyeshuri' },
  'payment.selectStudentPlaceholder': { en: 'Choose a student to pay for', rw: 'Hitamo umunyeshuri wo kwishyurira' },
  'payment.amount': { en: 'Amount', rw: 'Amafaranga' },
  'payment.amountPlaceholder': { en: 'Enter fee amount', rw: 'Andika amafaranga' },
  'payment.fillAllFields': { en: 'Please fill in all fields', rw: 'Nyamuneka uzuza imyanya yose' },
  'payment.invalidAmount': { en: 'Please enter a valid amount', rw: 'Nyamuneka andika amafaranga yemewe' },
  'payment.acceptedMethods': { en: 'Accepted payment methods:', rw: 'Uburyo bwo kwishyura bwemewe:' },
  'payment.cards': { en: 'Visa / Mastercard', rw: 'Visa / Mastercard' },
  'payment.payNow': { en: 'Pay Now', rw: 'Ishyura Ubu' },
  'payment.processing': { en: 'Processing...', rw: 'Birakozwe...' },
  'payment.noStudents': { en: 'No enrolled students found', rw: 'Nta banyeshuri bandikishijwe babonetse' },
  'payment.selectApplication': { en: 'Select Application', rw: 'Hitamo Inyandiko' },
  'payment.selectApplicationPlaceholder': { en: 'Choose an application to pay for', rw: 'Hitamo inyandiko yo kwishyura' },
  'payment.momoId': { en: 'MTN MoMo Transaction ID', rw: 'Umubare w\'Ibyaguzwe kwa MTN MoMo' },
  'payment.momoIdPlaceholder': { en: 'Enter the transaction ID from MoMo', rw: 'Andika umubare w\'ibyaguzwe uva kuri MoMo' },
  'payment.momoIdHint': { en: 'Find this in your MoMo payment confirmation SMS', rw: 'Biboneka mu butumwa bwa SMS bwemeza ubwishyu' },
  'payment.proof': { en: 'Payment Screenshot', rw: 'Ifoto y\'Ubwishyu' },
  'payment.proofHint': { en: 'Upload a screenshot of your MoMo payment confirmation', rw: 'Shyiraho ifoto y\'icyemezo cy\'ubwishyu bwa MoMo' },
  'payment.proofRequired': { en: 'Screenshot Required', rw: 'Ifoto Irasabwa' },
  'payment.proofRequiredDesc': { en: 'Please upload a screenshot of your payment', rw: 'Nyamuneka shyiraho ifoto y\'ubwishyu bwawe' },
  'payment.submit': { en: 'Submit Payment Proof', rw: 'Ohereza Icyemezo cy\'Ubwishyu' },
  'payment.success': { en: 'Payment Submitted!', rw: 'Ubwishyu Bwoherejwe!' },
  'payment.successDesc': { en: 'Your payment is being verified.', rw: 'Ubwishyu bwawe buri gusuzumwa.' },
  'payment.error': { en: 'Payment Failed', rw: 'Kwishyura Byanze' },
  'payment.noApplications': { en: 'No pending applications found', rw: 'Nta nyandiko zitegereje zabonetse' },
  'payment.registerFirst': { en: 'Register a student first', rw: 'Banza wandikishe umunyeshuri' },
  'payment.verifying': { en: 'Verifying Payment...', rw: 'Gusuzuma Ubwishyu...' },
  'payment.verified': { en: 'Payment Successful!', rw: 'Kwishyura Byagenze Neza!' },
  'payment.failed': { en: 'Payment Failed', rw: 'Kwishyura Byanze' },
  'payment.failedDesc': { en: 'Your payment could not be verified. Please try again.', rw: 'Ubwishyu bwawe ntibwashoboye gusuzumwa. Nyamuneka ongera ugerageze.' },
  'payment.amountPaid': { en: 'Amount Paid', rw: 'Amafaranga Yishyuwe' },
  'payment.backToDashboard': { en: 'Back to Dashboard', rw: 'Subira ku Ibikubiyemo' },
  'payment.history': { en: 'Payment History', rw: 'Amateka y\'Ubwishyu' },
  'payment.historyStudent': { en: 'Student', rw: 'Umunyeshuri' },
  'payment.historySchool': { en: 'School', rw: 'Ishuri' },
  'payment.historyAmount': { en: 'Amount', rw: 'Amafaranga' },
  'payment.historyDate': { en: 'Date', rw: 'Itariki' },
  'payment.historyStatus': { en: 'Status', rw: 'Uko Bihagaze' },
  'payment.statusCompleted': { en: 'Completed', rw: 'Byarangiye' },
  'payment.statusFailed': { en: 'Failed', rw: 'Byanze' },
  'payment.statusPending': { en: 'Pending', rw: 'Bitegereje' },
  
  // Student Hub
  'hub.title': { en: 'Student Hub', rw: 'Ikigo cy\'Abanyeshuri' },
  'hub.description': { en: 'View and manage all your registered children', rw: 'Reba kandi ugenzure abana bose wandikishije' },
  'hub.searchPlaceholder': { en: 'Enter Student ID to search...', rw: 'Andika ID y\'Umunyeshuri kugira ngo ushakishe...' },
  'hub.searchResult': { en: 'Search Result', rw: 'Ibisubizo byo Gushakisha' },
  'hub.myStudents': { en: 'My Students', rw: 'Abanyeshuri Banjye' },
  'hub.noStudents': { en: 'No students registered yet', rw: 'Nta banyeshuri bandikishijwe' },
  'hub.registerNow': { en: 'Register a Student', rw: 'Andikisha Umunyeshuri' },
  'hub.notFound': { en: 'Student Not Found', rw: 'Umunyeshuri Ntiyabonetse' },
  'hub.notFoundDesc': { en: 'No student with this ID was found', rw: 'Nta munyeshuri ufite iyi ID wabonetse' },
  'hub.parents': { en: 'Parents', rw: 'Ababyeyi' },
  'hub.status.pending': { en: 'Pending', rw: 'Bitegereje' },
  'hub.status.passed': { en: 'Passed', rw: 'Yaratsinze' },
  'hub.status.repeat': { en: 'Repeat', rw: 'Asubiramo' },
  'hub.reregister': { en: 'Re-register for New Year', rw: 'Ongera Iyandikishe ku Mwaka Mushya' },
  'hub.reregisterSuccess': { en: 'Re-registration Submitted!', rw: 'Kongera Kwiyandikisha Byoherejwe!' },
  'hub.reregisterSuccessDesc': { en: 'Application for the new year has been submitted.', rw: 'Inyandiko y\'umwaka mushya yoherejwe.' },
  'hub.reregisterError': { en: 'Re-registration Failed', rw: 'Kongera Kwiyandikisha Byanze' },
  
  // Footer
  'footer.rights': { en: 'All rights reserved', rw: 'Uburenganzira bwose bwabikijwe' },
  'footer.contact': { en: 'Contact Us', rw: 'Twandikire' },

  // School Welcome
  'school.welcome.appCardDesc': { en: 'View and manage all incoming applications', rw: 'Reba kandi ugenzure inyandiko zose zinjira' },
  'school.welcome.govPortal': { en: 'Government Portal', rw: 'Urwego rw\'Igihugu' },
  'school.welcome.govPortalDesc': { en: 'Class student lists with IDs for reporting & Excel export', rw: 'Urutonde rw\'abanyeshuri n\'ID ku raporo no gukuramo Excel' },
  
  // Common
  'common.cancel': { en: 'Cancel', rw: 'Hagarika' },
  
  // School Portal
  'school.nav.menu': { en: 'Menu', rw: 'Ibikubiyemo' },
  'school.nav.dashboard': { en: 'Dashboard', rw: 'Ibikubiyemo' },
  'school.nav.applications': { en: 'Applications', rw: 'Inyandiko' },
  'school.nav.students': { en: 'Students', rw: 'Abanyeshuri' },
  'school.nav.settings': { en: 'Settings', rw: 'Igenamiterere' },
  
  'school.dashboard.title': { en: 'Application Manager', rw: 'Umuyobozi w\'Inyandiko' },
  
  'school.pending.count': { en: 'Pending Applications', rw: 'Inyandiko Zitegereje' },
  
  'school.stats.total': { en: 'Total Applications', rw: 'Inyandiko Zose' },
  'school.stats.pending': { en: 'Pending', rw: 'Zitegereje' },
  'school.stats.newApps': { en: 'New Students', rw: 'Abanyeshuri Bashya' },
  'school.stats.transfers': { en: 'Transfers', rw: 'Abimutse' },
  
  'school.applications.title': { en: 'Student Applications', rw: 'Inyandiko z\'Abanyeshuri' },
  'school.applications.subtitle': { en: 'Review and manage incoming applications', rw: 'Suzuma kandi ugenzure inyandiko zinjira' },
  'school.applications.empty': { en: 'No applications yet', rw: 'Nta nyandiko zihari' },
  
  'school.filter.all': { en: 'All Types', rw: 'Ubwoko Bwose' },
  'school.filter.new': { en: 'New Students', rw: 'Abanyeshuri Bashya' },
  'school.filter.transfer': { en: 'Transfers', rw: 'Abimutse' },
  
  'school.table.student': { en: 'Student', rw: 'Umunyeshuri' },
  'school.table.type': { en: 'Type', rw: 'Ubwoko' },
  'school.table.grade': { en: 'Grade', rw: 'Icyiciro' },
  'school.table.date': { en: 'Applied', rw: 'Yoherejwe' },
  'school.table.payment': { en: 'Payment', rw: 'Kwishyura' },
  'school.table.status': { en: 'Status', rw: 'Uko Bihagaze' },
  'school.table.actions': { en: 'Actions', rw: 'Ibikorwa' },
  
  'school.status.approved': { en: 'Approved', rw: 'Byemejwe' },
  'school.status.enrolled': { en: 'Enrolled', rw: 'Yandikishijwe' },
  'school.status.rejected': { en: 'Rejected', rw: 'Byanzwe' },
  'school.status.pending': { en: 'Pending', rw: 'Bitegereje' },
  
  'school.type.new': { en: 'New', rw: 'Mushya' },
  'school.type.transfer': { en: 'Transfer', rw: 'Yimutse' },
  
  'school.payment.paid': { en: 'Paid', rw: 'Byishyuwe' },
  'school.payment.unpaid': { en: 'Unpaid', rw: 'Ntabyishyuwe' },
  
  'school.action.approve': { en: 'Approve', rw: 'Emeza' },
  'school.action.processApplication': { en: 'Process Application', rw: 'Suzuma Inyandiko' },
  
  'school.details.title': { en: 'Application Details', rw: 'Ibisobanuro by\'Inyandiko' },
  'school.details.subtitle': { en: 'Review student information and documents', rw: 'Suzuma amakuru y\'umunyeshuri n\'impapuro' },
  'school.details.studentName': { en: 'Student Name', rw: 'Izina ry\'Umunyeshuri' },
  'school.details.dob': { en: 'Date of Birth', rw: 'Itariki y\'Amavuko' },
  'school.details.grade': { en: 'Grade', rw: 'Icyiciro' },
  'school.details.type': { en: 'Application Type', rw: 'Ubwoko bw\'Inyandiko' },
  'school.details.mother': { en: 'Mother\'s Name', rw: 'Izina rya Mama' },
  'school.details.father': { en: 'Father\'s Name', rw: 'Izina rya Papa' },
  'school.details.transferInfo': { en: 'Transfer Information', rw: 'Amakuru yo Kwimuka' },
  'school.details.prevSchool': { en: 'Previous School', rw: 'Ishuri rya Mbere' },
  'school.details.reason': { en: 'Reason', rw: 'Impamvu' },
  'school.details.viewTranscripts': { en: 'View Transcripts', rw: 'Reba Amanota' },
  'school.details.viewPayment': { en: 'View Payment Proof', rw: 'Reba Icyemezo cy\'Ubwishyu' },
  
  'school.approval.title': { en: 'Approve Application', rw: 'Emeza Inyandiko' },
  'school.approval.subtitle': { en: 'Set status and class for', rw: 'Shyiraho uko bihagaze n\'ishami kuri' },
  'school.approval.status': { en: 'Student Status', rw: 'Uko Umunyeshuri Ahagaze' },
  'school.approval.passed': { en: 'Passed - Promote to Next Grade', rw: 'Yaratsinze - Ajye mu Cyiciro Gikurikira' },
  'school.approval.repeat': { en: 'Repeat - Stay in Current Grade', rw: 'Asubiramo - Agume muri Icyiciro Kimwe' },
  'school.approval.passedHint': { en: 'Student will be promoted to the next grade level', rw: 'Umunyeshuri azajya mu cyiciro gikurikira' },
  'school.approval.repeatHint': { en: 'Student will remain in the current grade level', rw: 'Umunyeshuri azaguma mu cyiciro kimwe' },
  'school.approval.stream': { en: 'Class/Stream', rw: 'Ishami' },
  'school.approval.class': { en: 'Class', rw: 'Ishami' },
  'school.approval.confirm': { en: 'Confirm Approval', rw: 'Emeza' },
  'school.approval.success': { en: 'Application Approved!', rw: 'Inyandiko Yemejwe!' },
  'school.approval.successDesc': { en: 'The student has been successfully enrolled.', rw: 'Umunyeshuri yandikishijwe neza.' },
  'school.approval.error': { en: 'Approval Failed', rw: 'Kwemeza Byanze' },
  
  // Tabs
  'school.tabs.title': { en: 'Manage Applications & Students', rw: 'Genzura Inyandiko n\'Abanyeshuri' },
  'school.tabs.subtitle': { en: 'Review applications and manage enrolled students', rw: 'Suzuma inyandiko kandi ugenzure abanyeshuri bandikishijwe' },
  'school.tabs.newApps': { en: 'New Applications', rw: 'Inyandiko Nshya' },
  'school.tabs.transfers': { en: 'Transfers', rw: 'Abimutse' },
  'school.tabs.students': { en: 'Student Management', rw: 'Kuyobora Abanyeshuri' },
  
  // New Applications Tab
  'school.newApps.empty': { en: 'No new applications yet', rw: 'Nta nyandiko nshya zihari' },
  'school.newApps.verifyDocs': { en: 'Verify birth certificate and payment proof', rw: 'Suzuma impamyabukwe n\'icyemezo cy\'ubwishyu' },
  'school.newApps.documents': { en: 'Required Documents', rw: 'Impapuro Zisabwa' },
  'school.newApps.viewBirthCert': { en: 'View Birth Certificate', rw: 'Reba Impamyabukwe' },
  'school.newApps.noTranscripts': { en: 'No documents uploaded', rw: 'Nta mpapuro zashyizwemo' },
  'school.newApps.noPayment': { en: 'No payment proof', rw: 'Nta cyemezo cy\'ubwishyu' },
  'school.newApps.approveTitle': { en: 'Approve New Student', rw: 'Emeza Umunyeshuri Mushya' },
  'school.newApps.approveDesc': { en: 'Assign class and generate student ID for', rw: 'Shyiraho ishami kandi ukore ID y\'umunyeshuri' },
  'school.newApps.idWillGenerate': { en: 'A unique Student ID will be generated upon approval. An SMS notification will be sent to the parent.', rw: 'ID y\'umunyeshuri idasanzwe izakorwa mu kwemeza. Ubutumwa bwa SMS buzohererezwa umubyeyi.' },
  'school.newApps.approveSuccess': { en: 'Student Approved!', rw: 'Umunyeshuri Yemejwe!' },
  'school.newApps.studentIdGenerated': { en: 'Student ID', rw: 'ID y\'Umunyeshuri' },
  'school.newApps.rejectTitle': { en: 'Reject Application', rw: 'Anga Inyandiko' },
  'school.newApps.rejectDesc': { en: 'Provide a reason for rejecting', rw: 'Tanga impamvu yo kwanga' },
  'school.newApps.rejectionReason': { en: 'Rejection Reason', rw: 'Impamvu yo Kwanga' },
  'school.newApps.rejectionPlaceholder': { en: 'e.g., Illegible document, missing information...', rw: 'urugero, Impapuro zidasomeka, amakuru abuze...' },
  'school.newApps.rejectionHint': { en: 'The parent will be notified and can re-upload documents.', rw: 'Umubyeyi azamenyeshwa kandi ashobora gushyira impapuro.' },
  'school.newApps.confirmReject': { en: 'Confirm Rejection', rw: 'Emeza Kwanga' },
  'school.newApps.rejectSuccess': { en: 'Application Rejected', rw: 'Inyandiko Yangijwe' },
  'school.newApps.rejectSuccessDesc': { en: 'The parent has been notified.', rw: 'Umubyeyi yamenyeshejwe.' },
  'school.action.reject': { en: 'Reject', rw: 'Anga' },
  
  // Transfers Tab
  'school.transfers.empty': { en: 'No transfer requests yet', rw: 'Nta nyandiko zo kwimuka zihari' },
  'school.transfers.fromSchool': { en: 'From School', rw: 'Ahuva' },
  'school.transfers.accept': { en: 'Accept', rw: 'Emera' },
  'school.transfers.detailsTitle': { en: 'Transfer Request Details', rw: 'Ibisobanuro by\'Icyifuzo cyo Kwimuka' },
  'school.transfers.verifyTransfer': { en: 'Verify transfer documents and school history', rw: 'Suzuma impapuro zo kwimuka n\'amateka y\'ishuri' },
  'school.transfers.requiredDocs': { en: 'Required Transfer Documents', rw: 'Impapuro zo Kwimuka Zisabwa' },
  'school.transfers.viewTranscripts': { en: 'View Transcripts', rw: 'Reba Amanota' },
  'school.transfers.missingTranscripts': { en: 'Missing Transcripts', rw: 'Amanota Abuze' },
  'school.transfers.acceptTitle': { en: 'Accept Transfer', rw: 'Emera Kwimuka' },
  'school.transfers.acceptDesc': { en: 'Assign grade and class for', rw: 'Shyiraho icyiciro n\'ishami kuri' },
  'school.transfers.assignGrade': { en: 'Assign Grade Level', rw: 'Shyiraho Icyiciro' },
  'school.transfers.selectGrade': { en: 'Select grade based on transcripts', rw: 'Hitamo icyiciro ukurikije amanota' },
  'school.transfers.originNote': { en: 'The previous school will be recorded in student history for MINEDUC reporting.', rw: 'Ishuri rya mbere rizandikwa mu mateka y\'umunyeshuri ku raporo ya MINEDUC.' },
  'school.transfers.confirmAccept': { en: 'Accept Transfer', rw: 'Emera Kwimuka' },
  'school.transfers.acceptSuccess': { en: 'Transfer Accepted!', rw: 'Kwimuka Kwemewe!' },
  'school.transfers.rejectTitle': { en: 'Reject Transfer', rw: 'Anga Kwimuka' },
  'school.transfers.rejectPlaceholder': { en: 'e.g., Unverified school, incomplete transcripts...', rw: 'urugero, Ishuri ritasuzumwe, amanota adakwiye...' },
  'school.transfers.rejectSuccess': { en: 'Transfer Rejected', rw: 'Kwimuka Kwanzwe' },
  
  // Student Management Tab
  'school.students.total': { en: 'Total Students', rw: 'Abanyeshuri Bose' },
  'school.students.passed': { en: 'Passed', rw: 'Batsinze' },
  'school.students.repeat': { en: 'Repeating', rw: 'Basubiramo' },
  'school.students.pending': { en: 'Pending Results', rw: 'Bategereje Ibisubizo' },
  'school.students.filterGrade': { en: 'Filter by Grade', rw: 'Hitamo ku Cyiciro' },
  'school.students.filterStream': { en: 'Filter by Class', rw: 'Hitamo ku Ishami' },
  'school.students.empty': { en: 'No students enrolled yet', rw: 'Nta banyeshuri bandikishijwe' },
  'school.students.studentId': { en: 'Student ID', rw: 'ID y\'Umunyeshuri' },
  'school.students.class': { en: 'Class', rw: 'Ishami' },
  'school.students.processResults': { en: 'Process Results', rw: 'Suzuma Ibisubizo' },
  'school.students.processResultsTitle': { en: 'Process End-of-Year Results', rw: 'Suzuma Ibisubizo by\'Iherezo ry\'Umwaka' },
  'school.students.processResultsDesc': { en: 'Set promotion status for', rw: 'Shyiraho uko umunyeshuri azimuka' },
  'school.students.currentGrade': { en: 'Current Grade', rw: 'Icyiciro Ubu' },
  'school.students.currentStatus': { en: 'Current Status', rw: 'Uko Ahagaze Ubu' },
  'school.students.markPassed': { en: 'Mark as Passed', rw: 'Shyiraho Yaratsinze' },
  'school.students.passedNote': { en: 'Promotes to next grade', rw: 'Azimuka mu cyiciro gikurikira' },
  'school.students.markRepeat': { en: 'Mark as Repeat', rw: 'Shyiraho Asubiramo' },
  'school.students.repeatNote': { en: 'Stays in current grade', rw: 'Aguma mu cyiciro kimwe' },
  'school.students.note': { en: 'Note', rw: 'Icyitonderwa' },
  'school.students.newYearNote': { en: 'When the "New Year" cycle is triggered, students marked as "Passed" will automatically move to the next grade level.', rw: 'Igihe "Umwaka Mushya" utangiye, abanyeshuri bashyizweho "Batsinze" bazimuka mu cyiciro gikurikira.' },
  'school.students.resultProcessed': { en: 'Result Processed', rw: 'Ibisubizo Byakozwe' },
  'school.students.resultProcessedDesc': { en: 'Student status has been updated.', rw: 'Uko umunyeshuri ahagaze byavuguruwe.' },
  'school.students.unassigned': { en: 'Unassigned', rw: 'Ntibashyizweho Icyiciro' },
  'school.students.expandAll': { en: 'Expand All', rw: 'Fungura Byose' },
  'school.students.collapseAll': { en: 'Collapse All', rw: 'Funga Byose' },
  'school.students.studentSingular': { en: 'student', rw: 'umunyeshuri' },
'school.students.studentPlural': { en: 'students', rw: 'abanyeshuri' },
  'rereg.polite': { en: 'Munezeo Janviere has completed Secondary 2 Class A. Please go to Student Hub → Re-register for the new year.', rw: 'Munezeo Janviere yizeze Secondary 2 Class A. Nyuma wandike mu Student Hub → Re-register ku mwaka mushya.' },
  
  // School Settings
  'school.settings.title': { en: 'School Settings', rw: 'Igenamiterere ry\'Ishuri' },
  'school.settings.subtitle': { en: 'Update your school profile and information', rw: 'Vugurura umwirondoro n\'amakuru y\'ishuri ryawe' },
  'school.settings.logo': { en: 'School Logo', rw: 'Ikimenyetso cy\'Ishuri' },
  'school.settings.logoDesc': { en: 'Upload or update your school logo', rw: 'Shyiramo cyangwa uvugurure ikimenyetso cy\'ishuri' },
  'school.settings.info': { en: 'School Information', rw: 'Amakuru y\'Ishuri' },
  'school.settings.infoDesc': { en: 'Basic details about your school', rw: 'Amakuru y\'ibanze ku ishuri ryawe' },
  'school.settings.staff': { en: 'Staff Information', rw: 'Amakuru y\'Umukozi' },
  'school.settings.staffDesc': { en: 'Your details as school administrator', rw: 'Amakuru yawe nk\'umuyobozi w\'ishuri' },
  'school.settings.location': { en: 'Location', rw: 'Ahantu' },
  'school.settings.locationDesc': { en: 'Your school\'s address in Rwanda', rw: 'Aderesi y\'ishuri ryawe mu Rwanda' },
  'school.settings.saveChanges': { en: 'Save Changes', rw: 'Bika Ibihindutse' },
  'school.settings.saved': { en: 'Settings Saved', rw: 'Igenamiterere Ryabitswe' },
  'school.settings.savedDesc': { en: 'Your school profile has been updated successfully.', rw: 'Umwirondoro w\'ishuri ryawe wavuguruwe neza.' },
  'school.settings.requirements': { en: 'School Requirements', rw: 'Ibisabwa n\'Ishuri' },
  'school.settings.requirementsDesc': { en: 'Upload a PDF document with your school\'s admission requirements', rw: 'Shyiramo inyandiko PDF ifite ibisabwa byo kwinjira mu ishuri ryawe' },
  'school.settings.uploadPdf': { en: 'Click to upload PDF', rw: 'Kanda ushyiremo PDF' },
  'school.settings.pdfHint': { en: 'PDF files up to 10MB', rw: 'Dosiye PDF kugeza 10MB' },
  'school.settings.currentPdf': { en: 'Current Requirements PDF', rw: 'PDF y\'Ibisabwa Iriho' },
  'school.settings.viewPdf': { en: 'View PDF', rw: 'Reba PDF' },
  'school.settings.replacePdf': { en: 'Replace PDF', rw: 'Hindura PDF' },

  // School Detail Dialog
  'schools.detailTitle': { en: 'School Details', rw: 'Ibisobanuro by\'Ishuri' },
  'schools.location': { en: 'Location', rw: 'Ahantu' },
  'schools.requirements': { en: 'Admission Requirements', rw: 'Ibisabwa byo Kwinjira' },
  'schools.downloadRequirements': { en: 'Download Requirements PDF', rw: 'Kuramo PDF y\'Ibisabwa' },
  'schools.noRequirements': { en: 'This school has not uploaded their requirements yet.', rw: 'Iri shuri ntirishyizeho ibisabwa byaryo.' },
  'schools.applyNow': { en: 'Apply for This School', rw: 'Saba muri Iri Shuri' },
  'schools.loginToApply': { en: 'Sign in to apply', rw: 'Injira kugira ngo usabe' },
  
  // Common additions
  'common.error': { en: 'Error', rw: 'Ikosa' },
  'common.saving': { en: 'Saving...', rw: 'Birabikwa...' },
  
  // Auth additions
  'auth.schoolName': { en: 'School Name', rw: 'Izina ry\'Ishuri' },
  'auth.schoolNamePlaceholder': { en: 'Enter school name', rw: 'Andika izina ry\'ishuri' },
  'auth.staffName': { en: 'Your Full Name', rw: 'Amazina Yawe Yose' },
  'auth.staffNamePlaceholder': { en: 'Enter your full name', rw: 'Andika amazina yawe yose' },
  'auth.staffRole': { en: 'Your Role', rw: 'Umwanya Wawe' },
  'auth.staffRolePlaceholder': { en: 'e.g., Director, Headmaster', rw: 'urugero, Umuyobozi, Umukuru w\'Ishuri' },
  'auth.qualifications': { en: 'Qualifications', rw: 'Impamyabumenyi' },
  'auth.qualificationsPlaceholder': { en: 'e.g., Bachelor\'s in Education', rw: 'urugero, Impamyabumenyi mu Burezi' },
  'auth.province': { en: 'Province', rw: 'Intara' },
  'auth.selectProvince': { en: 'Select Province', rw: 'Hitamo Intara' },
  'auth.district': { en: 'District', rw: 'Akarere' },
  'auth.selectDistrict': { en: 'Select District', rw: 'Hitamo Akarere' },
  'auth.sector': { en: 'Sector', rw: 'Umurenge' },
  'auth.selectSector': { en: 'Select Sector', rw: 'Hitamo Umurenge' },
  'auth.uploadLogo': { en: 'Click to upload logo', rw: 'Kanda ushyiremo ikimenyetso' },
  'auth.logoHint': { en: 'PNG, JPG up to 2MB', rw: 'PNG, JPG kugeza 2MB' },
  'auth.logoTooLarge': { en: 'Logo must be less than 2MB', rw: 'Ikimenyetso kigomba kuba munsi ya 2MB' },
  'auth.schoolDescPlaceholder': { en: 'Briefly describe your school, its mission, and what makes it unique...', rw: 'Sobanura muri make ishuri ryawe, intego yaryo, n\'icyarihariye...' },

  // Chat / Inbox
  'chat.inbox': { en: 'Inbox', rw: 'Ubutumwa' },
  'chat.unread': { en: 'unread', rw: 'bitasomwe' },
  'chat.noMessages': { en: 'No messages yet', rw: 'Nta butumwa buriho' },
  'chat.typePlaceholder': { en: 'Type a message...', rw: 'Andika ubutumwa...' },
  'chat.backToInbox': { en: 'Back to Inbox', rw: 'Subira ku Butumwa' },
  'chat.applicationThread': { en: 'Application thread', rw: 'Ubutumwa bw\'inyandiko' },
  'dashboard.inbox': { en: 'Messages', rw: 'Ubutumwa' },
  'dashboard.inboxDesc': { en: 'Chat with school admins about applications & payments', rw: 'Ganira n\'abayobozi b\'amashuri ku nyandiko n\'ubwishyu' },
  'dashboard.openInbox': { en: 'Open Inbox', rw: 'Fungura Ubutumwa' },

  // Re-registration
  'rereg.empty': { en: 'No re-registration applications yet.', rw: 'Nta nyandiko zo kongera kwiyandikisha zihari.' },
  'rereg.studentName': { en: 'Student Name', rw: 'Izina ry\'Umunyeshuri' },
  'rereg.studentId': { en: 'Student ID', rw: 'ID y\'Umunyeshuri' },
  'rereg.previousClass': { en: 'Previous Class', rw: 'Ishami rya Mbere' },
  'rereg.newClass': { en: 'New Class', rw: 'Ishami Rishya' },
  'rereg.appliedDate': { en: 'Applied Date', rw: 'Itariki Yoherejwe' },
  'rereg.payment': { en: 'Payment', rw: 'Kwishyura' },
  'rereg.status': { en: 'Status', rw: 'Uko Bihagaze' },
  'rereg.actions': { en: 'Actions', rw: 'Ibikorwa' },
  'rereg.paid': { en: 'Paid', rw: 'Byishyuwe' },
  'rereg.unpaid': { en: 'Unpaid', rw: 'Ntabyishyuwe' },
  'rereg.approved': { en: 'Approved', rw: 'Byemejwe' },
  'rereg.rejected': { en: 'Rejected', rw: 'Byanzwe' },
  'rereg.pending': { en: 'Pending', rw: 'Bitegereje' },
  'rereg.approve': { en: 'Approve', rw: 'Emeza' },
  'rereg.detailsTitle': { en: 'Re-registration Details', rw: 'Ibisobanuro byo Kongera Kwiyandikisha' },
  'rereg.student': { en: 'Student', rw: 'Umunyeshuri' },
  'rereg.id': { en: 'ID', rw: 'ID' },
  'rereg.uploadedTranscripts': { en: 'Uploaded Transcripts', rw: 'Amanota Yashyizwemo' },
  'rereg.approveTitle': { en: 'Approve Re-registration', rw: 'Emeza Kongera Kwiyandikisha' },
  'rereg.assignClass': { en: 'Assign Class Stream', rw: 'Shyiraho Ishami' },
  'rereg.confirm': { en: 'Confirm', rw: 'Emeza' },
  'rereg.approveSuccess': { en: 'Re-registration Approved', rw: 'Kongera Kwiyandikisha Byemejwe' },
  'rereg.approveSuccessDesc': { en: 'Student has been assigned to the new class.', rw: 'Umunyeshuri yashyizwe mu ishami rishya.' },

  // Government Portal
  'gov.republic': { en: 'Republic of Rwanda — Ministry of Education', rw: 'Repubulika y\'u Rwanda — Minisiteri y\'Uburezi' },
  'gov.studentsAcross': { en: 'students across', rw: 'abanyeshuri mu' },
  'gov.classes': { en: 'class(es)', rw: 'ishami (amashami)' },
  'gov.class': { en: 'Class', rw: 'Ishami' },
  'gov.exportExcel': { en: 'Export Excel', rw: 'Kuramo Excel' },
  'gov.exportComplete': { en: 'Export Complete', rw: 'Gukuramo Byarangiye' },
  'gov.exported': { en: 'exported as Excel.', rw: 'byakuwe mu buryo bwa Excel.' },
  'gov.studentId': { en: 'Student ID', rw: 'ID y\'Umunyeshuri' },
  'gov.name': { en: 'Name', rw: 'Izina' },
  'gov.dob': { en: 'DOB', rw: 'Itariki y\'Amavuko' },
  'gov.mother': { en: 'Mother', rw: 'Mama' },
  'gov.motherPhone': { en: 'Mother Phone', rw: 'Telefoni ya Mama' },
  'gov.father': { en: 'Father', rw: 'Papa' },
  'gov.fatherPhone': { en: 'Father Phone', rw: 'Telefoni ya Papa' },
  'gov.email': { en: 'Email', rw: 'Imeyili' },
  'gov.transcripts': { en: 'Transcripts', rw: 'Amanota' },
  'gov.transcriptError': { en: 'Could not open transcript', rw: 'Ntibishoboka gufungura amanota' },

  // Document Upload
  'doc.dragDrop': { en: 'Drag & drop files here, or click to browse', rw: 'Kurura dosiye hano, cyangwa ukande ushakishe' },
  'doc.maxSize': { en: 'max per file', rw: 'ntarengwa kuri dosiye' },
  'doc.uploadedFiles': { en: 'Uploaded Files', rw: 'Dosiye Zashyizwemo' },

  // Payment updates
  'payment.proofTitle': { en: 'Payment Proof', rw: 'Icyemezo cy\'Ubwishyu' },
  'payment.proofDesc': { en: 'Upload proof of payment for your child\'s school fees', rw: 'Shyiraho icyemezo cy\'ubwishyu bw\'amafaranga y\'ishuri ry\'umwana wawe' },
  'payment.markPaid': { en: 'Mark as Paid', rw: 'Shyiraho Byishyuwe' },

  // School description
  'auth.school.description': { en: 'School Description', rw: 'Ibisobanuro by\'Ishuri' },
  'auth.school.descriptionPlaceholder': { en: 'Briefly describe your school...', rw: 'Sobanura mu magambo make ishuri ryawe...' },
  'school.settings.description': { en: 'School Description', rw: 'Ibisobanuro by\'Ishuri' },
  'school.settings.descriptionPlaceholder': { en: 'Describe your school...', rw: 'Sobanura ishuri ryawe...' },
  'school.settings.showcaseImage': { en: 'Showcase Image', rw: 'Ifoto Igaragaza Ishuri' },
  'school.settings.uploadRequirements': { en: 'Upload Requirements PDF', rw: 'Shyiramo PDF y\'Ibisabwa' },
  'school.settings.requirementsList': { en: 'Uploaded Requirements', rw: 'Ibisabwa Byashyizwemo' },
  'school.settings.deleteFile': { en: 'Delete', rw: 'Siba' },

  // Student management
  'school.students.clearNotify': { en: 'Clear & Notify', rw: 'Gusiba & Kumenyesha' },
  'school.students.clearNotifyDesc': { en: 'Clear all classes for new year and notify parents to re-register.', rw: 'Gusiba amashami yose ku mwaka mushya no kumenyesha ababyeyi kongera kwiyandikisha.' },
  'school.students.exportPdf': { en: 'Export PDF', rw: 'Kuramo PDF' },

  // School card
  'schools.description': { en: 'School Description', rw: 'Ibisobanuro by\'Ishuri' },
  'schools.viewRequirements': { en: 'View Requirements', rw: 'Reba Ibisabwa' },
  'schools.downloadRequirementsBtn': { en: 'Download Requirements', rw: 'Kuramo Ibisabwa' },
  'schools.about': { en: 'About', rw: 'Ibyerekeye' },
  'schools.signUpToApply': { en: 'Sign Up to Apply', rw: 'Iyandikishe Kugira Ngo Usabe' },
  'schools.createAccountToApply': { en: 'Create an account or sign in to apply to this school.', rw: 'Fungura konti cyangwa injira kugira ngo usabe muri iri shuri.' },
  'schools.allProvinces': { en: 'All Provinces', rw: 'Intara Zose' },
  'schools.allDistricts': { en: 'All Districts', rw: 'Akarere Kose' },
  'schools.allSectors': { en: 'All Sectors', rw: 'Imirenge Yose' },
  'schools.noResults': { en: 'No schools found matching your criteria. Try adjusting your filters.', rw: 'Nta mashuri abonetse akurikije ibyifuzo byawe. Gerageza guhindura uburyo bwo gushakisha.' },

  // StudentHub
  'hub.enrolled': { en: 'Enrolled', rw: 'Yandikishijwe' },
  'hub.reregisterDesc': { en: 'Re-register your child for the new academic year', rw: 'Ongera wiyandikishe umwana wawe ku mwaka mushya w\'amashuri' },
  'hub.startReregister': { en: 'Start Re-registration', rw: 'Tangira Kongera Kwiyandikisha' },
  'hub.selectStudent': { en: 'Select Student', rw: 'Hitamo Umunyeshuri' },

  // Transfer details dialog
  'school.details.parentContact': { en: 'Parent Contact Information', rw: 'Amakuru yo Gutumanahana n\'Umubyeyi' },
  'school.details.emailLabel': { en: 'Email:', rw: 'Imeyili:' },
  'school.details.phoneLabel': { en: 'Phone:', rw: 'Telefoni:' },
  'school.details.motherLabel': { en: 'Mother:', rw: 'Mama:' },
  'school.details.fatherLabel': { en: 'Father:', rw: 'Papa:' },
  'school.details.studentIdLabel': { en: 'Student ID', rw: 'ID y\'Umunyeshuri' },

  // New applications details
  'school.details.parentInfo': { en: 'Parent Information', rw: 'Amakuru y\'Umubyeyi' },
  'school.details.reregDetails': { en: 'Re-registration Details', rw: 'Ibisobanuro byo Kongera Kwiyandikisha' },
  'school.details.previousClass': { en: 'Previous Class:', rw: 'Ishami rya Mbere:' },
  'school.details.newClass': { en: 'New Class:', rw: 'Ishami Rishya:' },
  'school.details.uploadedDocs': { en: 'Uploaded Documents', rw: 'Impapuro Zashyizwemo' },
  'school.details.paymentProof': { en: 'Payment Proof', rw: 'Icyemezo cy\'Ubwishyu' },
  'school.details.viewPaymentProof': { en: 'View Payment Proof', rw: 'Reba Icyemezo cy\'Ubwishyu' },

  // Student management tab
  'school.students.payment': { en: 'Payment', rw: 'Kwishyura' },
  'school.students.documents': { en: 'Documents', rw: 'Impapuro' },
  'school.students.noStudentsInClass': { en: 'No students in this class yet', rw: 'Nta banyeshuri bahari muri iki cyiciro' },
  'school.students.pdfReady': { en: 'PDF Ready', rw: 'PDF Iteganyijwe' },
  'school.students.pdfDesc': { en: 'class list opened for printing/saving as PDF.', rw: 'urutonde rw\'ishami rufunguwe guterwa/kubikwa nka PDF.' },
  'school.students.classExported': { en: 'Class exported', rw: 'Ishami Ryakuwe' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
