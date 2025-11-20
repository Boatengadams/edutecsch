
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ---------------------
    // SAFE HELPER FUNCTIONS
    // ---------------------
    function isSignedIn() {
      return request.auth != null;
    }
    
    function getCaller() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }
    
    function callerExists() {
      return exists(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function isCallerAdmin() {
      return callerExists() && (
        getCaller().data.role == 'admin' ||
        getCaller().data.isAlsoAdmin == true
      );
    }

    function isCallerApproved() {
      return isSignedIn()
        && callerExists()
        && (
          getCaller().data.status == 'approved' ||
          getCaller().data.role == 'admin'
        );
    }

    function isAuthorizedToCreateUser(newUserId) {
      let caller = getCaller().data;
      let isTeacher = caller.role == 'teacher';
      let isAdmin   = caller.role == 'admin' || caller.isAlsoAdmin == true;

      return isTeacher || isAdmin;
    }

    // ---------------------
    // COLLECTION RULES
    // ---------------------

    // Users Collection
    match /users/{userId} {
      // Allow creation if signed in (needed for registration)
      allow create: if isSignedIn();
      
      // Allow updating own profile or if admin
      allow update: if request.auth.uid == userId || isCallerAdmin();
      
      // Allow deletion only by admins
      allow delete: if isCallerAdmin();

      // Separate GET (single document read) from LIST (collection query)
      // This prevents recursion when reading own profile for status checks
      allow get: if request.auth.uid == userId || isCallerApproved();
      
      // Only approved users can list other users
      allow list: if isCallerApproved();
    }

    // School Configuration
    match /schoolConfig/{docId} {
      allow read: if true; // Public read for settings like school name
      allow write: if isCallerAdmin();
    }

    // Activation Tokens
    match /activationTokens/{tokenId} {
       allow read, write: if isCallerAdmin();
    }

    // Assignments
    match /assignments/{assignmentId} {
      allow read: if isCallerApproved();
      allow write: if isCallerApproved(); // Teachers/Admins usually, handled by app logic
    }

    // Submissions
    match /submissions/{submissionId} {
      allow read: if isCallerApproved();
      allow create: if isCallerApproved();
      allow update: if isCallerApproved();
      allow delete: if isCallerApproved(); // Teachers might need to delete
    }

    // Teaching Materials
    match /teachingMaterials/{materialId} {
      allow read: if isCallerApproved();
      allow write: if isCallerApproved();
    }
    
    // Video Content
    match /videoContent/{creatorId}/videos/{videoId} {
        allow read: if isCallerApproved();
        allow write: if request.auth.uid == creatorId || isCallerAdmin();
    }

    // Generated Content (AI Presentations/Quizzes)
    match /generatedContent/{contentId} {
      allow read: if isCallerApproved();
      allow write: if isCallerApproved();
    }

    // Live Lessons
    match /liveLessons/{lessonId} {
      allow read: if isCallerApproved();
      allow write: if isCallerApproved();
      
       match /images/{imageId} {
          allow read: if isCallerApproved();
          allow write: if isCallerApproved();
       }
       match /responses/{responseId} {
          allow read: if isCallerApproved();
          allow create: if isCallerApproved();
       }
       match /breakoutWhiteboards/{roomId} {
           allow read, write: if isCallerApproved();
       }
    }

    // Groups
    match /groups/{groupId} {
        allow read: if isCallerApproved();
        allow write: if isCallerApproved();
        
        match /groupMessages/{messageId} {
            allow read: if isCallerApproved();
            allow create: if isCallerApproved();
        }
    }

    // Notifications
    match /notifications/{notificationId} {
      allow read: if request.auth.uid == resource.data.userId;
      allow create: if isCallerApproved(); // Admins/Teachers sending
      allow update: if request.auth.uid == resource.data.userId; // Mark as read
    }
    
    // Conversations (Direct Messaging)
    match /conversations/{conversationId} {
        allow read: if request.auth.uid in resource.data.participantUids;
        allow create: if isCallerApproved();
        allow update: if request.auth.uid in resource.data.participantUids;
        
        match /messages/{messageId} {
            allow read: if isCallerApproved(); // Simplified for subcollection
            allow create: if isCallerApproved();
        }
    }

    // Calendar Events
    match /calendarEvents/{eventId} {
      allow read: if isCallerApproved();
      allow write: if isCallerAdmin() || (isCallerApproved() && getCaller().data.role == 'teacher');
    }
    
    // Timetables
    match /timetables/{classId} {
        allow read: if isCallerApproved();
        allow write: if isCallerAdmin();
    }
    
    // Attendance
    match /attendance/{recordId} {
        allow read: if isCallerApproved();
        allow write: if isCallerApproved(); // Teachers take attendance
    }

    // Terminal Reports
    match /terminalReports/{reportId} {
        allow read: if isCallerApproved();
        allow write: if isCallerApproved(); // Teachers write reports
    }
    
    // Report Summaries
    match /reportSummaries/{summaryId} {
        allow read: if isCallerApproved();
        allow write: if isCallerApproved();
    }
    
    // Published Flyers
    match /publishedFlyers/{flyerId} {
        allow read: if true; // Public or authenticated
        allow write: if isCallerApproved();
    }

    // User Activity Logs
    match /userActivity/{logId} {
        allow create: if isSignedIn();
        allow read: if isCallerAdmin() || (isCallerApproved() && getCaller().data.role == 'teacher');
    }
  }
}
