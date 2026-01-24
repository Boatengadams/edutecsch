rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    /* ==============================
       CORE AUTH HELPERS
    ============================== */

    function isSignedIn() {
      return request.auth != null;
    }

    function userDoc(uid) {
      return get(/databases/$(database)/documents/users/$(uid));
    }

    function userExists(uid) {
      return exists(/databases/$(database)/documents/users/$(uid));
    }

    function isSuperAdmin() {
      return request.auth != null &&
        request.auth.token.email in [
          'bagsgraphics4g@gmail.com',
          'boatengadams4g@gmail.com'
        ];
    }

    function isCallerAdmin() {
      return isSuperAdmin() ||
        (userExists(request.auth.uid) &&
         (
           userDoc(request.auth.uid).data.role == 'admin' ||
           userDoc(request.auth.uid).data.isAlsoAdmin == true
         ));
    }

    function isCallerApproved() {
      return isSignedIn() &&
        (
          isSuperAdmin() ||
          (
            userExists(request.auth.uid) &&
            (
              userDoc(request.auth.uid).data.status == 'approved' ||
              userDoc(request.auth.uid).data.role == 'admin'
            )
          )
        );
    }

    /* ==============================
       SAFE UPDATE GUARDS
    ============================== */

    function isSafeUserUpdate() {
      let incoming = request.resource.data;
      let existing = resource.data;
      return incoming.role == existing.role
        && incoming.status == existing.status
        && incoming.adminType == existing.adminType
        && incoming.isAlsoAdmin == existing.isAlsoAdmin
        && incoming.isAlsoTeacher == existing.isAlsoTeacher;
    }

    /* ==============================
       ACTIVATION TOKENS (MERGED)
    ============================== */

    function isValidToken(tokenId) {
      return tokenId in [
        'EDUTEC-TRIAL-8822-XP','EDUTEC-TRIAL-4491-ZT','EDUTEC-TRIAL-1103-QA',
        'EDUTEC-TERM-X992-LK','EDUTEC-TERM-Z112-MW','EDUTEC-TERM-K443-PS',
        'EDUTEC-TERM-P009-RV','EDUTEC-TERM-Q887-NB','EDUTEC-TERM-W332-XC',
        'EDUTEC-TERM-L771-BH','EDUTEC-TERM-R554-MJ','EDUTEC-TERM-T221-OP',
        'EDUTEC-MONT-M123-SV','EDUTEC-MONT-M456-RX',
        'EDUTEC-YEAR-ULT-Z99','EDUTEC-YEAR-ULT-W88','EDUTEC-YEAR-ULT-P77'
      ];
    }

    match /activationTokens/{tokenId} {
      allow get: if isSignedIn();

      allow create: if isSuperAdmin() && isValidToken(tokenId);

      allow update: if isCallerAdmin()
        && isValidToken(tokenId)
        && resource.data.isUsed == false
        && request.resource.data.isUsed == true
        && request.resource.data.usedBy == request.auth.uid;
    }

    /* ==============================
       USERS (MERGED + HARDENED)
    ============================== */

    match /users/{userId} {
      allow get: if isSignedIn() &&
        (request.auth.uid == userId || isCallerApproved());

      allow list: if isCallerApproved();

      allow create: if
        (
          isSignedIn()
          && request.auth.uid == userId
          && request.resource.data.role in ['student','teacher','parent']
          && request.resource.data.status == 'pending'
          && !('isAlsoAdmin' in request.resource.data)
        );

      allow update: if
        isCallerAdmin()
        || (
          isSignedIn()
          && request.auth.uid == userId
          && isSafeUserUpdate()
        );

      allow delete: if isCallerAdmin();
    }

    /* ==============================
       USER ACTIVITY LOGS
    ============================== */

    match /userActivity/{logId} {
      allow create: if isSignedIn()
        && request.resource.data.userId == request.auth.uid;

      allow read, list: if isCallerAdmin()
        || (isCallerApproved() && userDoc(request.auth.uid).data.role == 'teacher');

      allow update, delete: if isCallerAdmin();
    }

    /* ==============================
       SCHOOL CONFIG
    ============================== */

    match /schoolConfig/{docId} {
      allow read: if true;
      allow write: if isCallerAdmin();
    }

    /* ==============================
       CONVERSATIONS + MESSAGES
    ============================== */

    match /conversations/{conversationId} {
      function isParticipant() {
        return request.auth.uid in resource.data.participantUids;
      }

      allow get, update: if isCallerApproved() && isParticipant();
      allow list: if isCallerApproved() && isParticipant();

      allow create: if isCallerApproved()
        && request.auth.uid in request.resource.data.participantUids;

      match /messages/{messageId} {
        allow read, list: if isCallerApproved() && isParticipant();
        allow create: if isCallerApproved()
          && request.resource.data.senderId == request.auth.uid;
      }
    }

    /* ==============================
       ASSIGNMENTS
    ============================== */

    match /assignments/{assignmentId} {
      allow read: if isCallerApproved();

      allow create: if isCallerApproved()
        && userDoc(request.auth.uid).data.role == 'teacher'
        && request.resource.data.teacherId == request.auth.uid;

      allow update, delete: if isCallerAdmin()
        || (
          userDoc(request.auth.uid).data.role == 'teacher'
          && resource.data.teacherId == request.auth.uid
        );
    }

    /* ==============================
       SUBMISSIONS
    ============================== */

    match /submissions/{submissionId} {
      allow create: if isCallerApproved()
        && userDoc(request.auth.uid).data.role == 'student'
        && request.resource.data.studentId == request.auth.uid;

      allow read: if isCallerAdmin()
        || request.auth.uid == resource.data.studentId
        || request.auth.uid == resource.data.teacherId;

      allow update: if isCallerAdmin()
        || (
          userDoc(request.auth.uid).data.role == 'teacher'
          && request.auth.uid == resource.data.teacherId
        );

      allow delete: if isCallerAdmin();
    }

    /* ==============================
       GENERATED CONTENT
    ============================== */

    match /generatedContent/{contentId} {
      allow read: if isCallerApproved();

      allow create: if isCallerApproved()
        && userDoc(request.auth.uid).data.role == 'teacher';

      allow update, delete: if isCallerAdmin();
    }

    /* ==============================
       DEFAULT DENY
    ============================== */

    match /{path=**} {
      allow read, write: if false;
    }
  }
}
