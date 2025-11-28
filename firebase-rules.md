
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
    
    // Validates that a user isn't trying to grant themselves admin privileges
    function isSafeUserUpdate() {
      let incoming = request.resource.data;
      let existing = resource.data;
      return incoming.role == existing.role
          && incoming.status == existing.status
          && incoming.adminType == existing.adminType
          && incoming.isAlsoAdmin == existing.isAlsoAdmin
          && incoming.isAlsoTeacher == existing.isAlsoTeacher;
    }

    function isAuthorizedToCreateUser(newUserId) {
      // Inlined logic for admin/teacher creation of other users
      return isSignedIn()
        && callerExists()
        && request.resource.data.uid == newUserId
        && request.resource.data.status == 'pending'
        && 'name' in request.resource.data
        && 'email' in request.resource.data
        && 'role' in request.resource.data
        && (
          // Admin can create any user
          (getCaller().data.role == 'admin' || getCaller().data.isAlsoAdmin == true)
          ||
          // Teachers can create specific users
          (
            getCaller().data.role == 'teacher' &&
            (
              (
                request.resource.data.role == 'student' &&
                (
                  request.resource.data.class in getCaller().data.classesTaught ||
                  request.resource.data.class == getCaller().data.classTeacherOf
                )
              ) ||
              (
                request.resource.data.role == 'parent' &&
                exists(/databases/$(database)/documents/users/$(request.resource.data.childUids[0])) &&
                (
                  get(/databases/$(database)/documents/users/$(request.resource.data.childUids[0])).data.class 
                    in getCaller().data.classesTaught ||
                  get(/databases/$(database)/documents/users/$(request.resource.data.childUids[0])).data.class 
                    == getCaller().data.classTeacherOf
                )
              )
            )
          )
        );
    }


    // ---------------------
    // USERS
    // ---------------------
    match /users/{userId} {
      // Explicitly allow users to read their own document
      allow get: if isSignedIn() && request.auth.uid == userId;
      
      // Allow approved users to read other profiles
      allow get: if isCallerApproved();
      
      // Allow listing users only if the caller is approved
      // Students should preferably not list all users, but searching requires it currently.
      allow list: if isCallerApproved();

      // Creation Logic
      allow create: if
        // 1. Self-Registration (Strict)
        (
          isSignedIn() 
          && request.auth.uid == userId
          && request.resource.data.role in ['student', 'teacher', 'parent'] // No admin self-creation
          && request.resource.data.status == 'pending' // Must start as pending
          && !('adminType' in request.resource.data)
          && !('isAlsoAdmin' in request.resource.data)
        )
        // 2. Admin/Teacher creating others
        || isAuthorizedToCreateUser(userId);

      // Update Logic
      allow update: if
        isCallerAdmin()
        ||
        (
          isSignedIn()
          && request.auth.uid == userId
          && isSafeUserUpdate() // Prevents privilege escalation
        );

      allow delete: if isCallerAdmin();
    }
    
    // ---------------------
    // USER ACTIVITY LOGS
    // ---------------------
    match /userActivity/{logId} {
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow read, list: if isCallerAdmin() || (isCallerApproved() && getCaller().data.role == 'teacher');
      allow update, delete: if isCallerAdmin();
    }


    // ---------------------
    // SCHOOL CONFIG
    // ---------------------
    match /schoolConfig/{docId} {
      allow read: if true;
      allow write: if isCallerAdmin();
    }


    // ---------------------
    // ACTIVATION TOKENS
    // ---------------------
    match /activationTokens/{tokenId} {
      allow read, write: if isCallerAdmin();
    }


    // ---------------------
    // CONVERSATIONS + MESSAGES
    // ---------------------
    match /conversations/{conversationId} {
      function isParticipant() {
        return request.auth.uid in resource.data.participantUids;
      }

      allow get: if isCallerApproved() && isParticipant();
      
      // Enforce that users can only list conversations they are part of
      allow list: if isCallerApproved() && request.auth.uid in resource.data.participantUids;
      
      allow create: if isCallerApproved()
        && request.auth.uid in request.resource.data.participantUids;
        
      allow update: if isCallerApproved() && isParticipant();

      match /messages/{messageId} {
        function isParentParticipant() {
           return request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantUids;
        }

        allow read, list: if isCallerApproved() && isParentParticipant();
        allow create: if isCallerApproved()
          && isParentParticipant()
          && request.resource.data.senderId == request.auth.uid;
      }
    }


    // ---------------------
    // ASSIGNMENTS
    // ---------------------
    match /assignments/{assignmentId} {
      allow read: if isCallerApproved();

      allow create: if isCallerApproved()
        && getCaller().data.role == 'teacher'
        && request.resource.data.teacherId == request.auth.uid;

      allow update, delete: if
        isCallerAdmin()
        ||
        (
          isCallerApproved()
          && getCaller().data.role == 'teacher'
          && resource.data.teacherId == request.auth.uid
        );
    }


    // ---------------------
    // SUBMISSIONS
    // ---------------------
    match /submissions/{submissionId} {

      allow get: if isCallerApproved()
        && (
          isCallerAdmin() ||
          resource.data.studentId == request.auth.uid ||
          resource.data.teacherId == request.auth.uid ||
          (
            getCaller().data.role == 'parent' &&
            resource.data.studentId in getCaller().data.childUids
          )
        );

      // Secure List: Users can only list submissions they own, teach, or parent
      allow list: if isCallerApproved() && (
          isCallerAdmin() ||
          resource.data.studentId == request.auth.uid ||
          resource.data.teacherId == request.auth.uid
      );

      allow create: if isCallerApproved()
        && getCaller().data.role == 'student'
        && request.resource.data.studentId == request.auth.uid;

      allow update: if
        isCallerAdmin()
        ||
        (
          isCallerApproved()
          &&
          (
            (
              getCaller().data.role == 'teacher'
              && resource.data.teacherId == request.auth.uid
            )
            ||
            (
              getCaller().data.role == 'student'
              && resource.data.studentId == request.auth.uid
              && resource.data.grade == null // Student cannot change grade
            )
          )
        );

      allow delete: if
        isCallerAdmin()
        ||
        (
          isCallerApproved()
          && getCaller().data.role == 'teacher'
          && resource.data.teacherId == request.auth.uid
        );
    }


    // ---------------------
    // ATTENDANCE
    // ---------------------
    match /attendance/{recordId} {
      allow read: if isCallerApproved();

      allow create: if isCallerApproved()
        && getCaller().data.role == 'teacher'
        && getCaller().data.classTeacherOf == request.resource.data.classId
        && request.resource.data.teacherId == request.auth.uid;

      allow update: if isCallerApproved()
        && getCaller().data.role == 'teacher'
        && getCaller().data.classTeacherOf == resource.data.classId;

      allow delete: if isCallerAdmin();
    }


    // ---------------------
    // NOTIFICATIONS
    // ---------------------
    match /notifications/{notificationId} {
      allow get, update: if isCallerApproved()
        && resource.data.userId == request.auth.uid;

      allow list: if isCallerApproved() && resource.data.userId == request.auth.uid;

      allow create: if isCallerApproved()
        && (getCaller().data.role == 'teacher' || getCaller().data.role == 'admin');

      allow delete: if isCallerAdmin();
    }


    // ---------------------
    // GENERATED CONTENT
    // ---------------------
    match /generatedContent/{contentId} {
      allow read: if isCallerApproved(); 
      
      allow create: if isCallerApproved()
        && getCaller().data.role == 'teacher'
        && request.resource.data.teacherId == request.auth.uid;

      allow update: if isCallerApproved()
        && getCaller().data.role == 'teacher'
        && (request.auth.uid in resource.data.collaboratorUids || resource.data.teacherId == request.auth.uid);

      allow delete: if
        isCallerAdmin()
        ||
        (
          isCallerApproved()
          && getCaller().data.role == 'teacher'
          && resource.data.teacherId == request.auth.uid
        );
    }


    // ---------------------
    // VIDEO CONTENT
    // ---------------------
    match /videoContent/{creatorId}/videos/{videoId} {
      allow read: if isCallerApproved();

      allow create: if isCallerApproved()
        && (getCaller().data.role == 'teacher' || getCaller().data.role == 'admin')
        && creatorId == request.auth.uid;

      allow delete: if
        isCallerAdmin()
        ||
        (isCallerApproved() && creatorId == request.auth.uid);
    }


    // ---------------------
    // TEACHING MATERIALS
    // ---------------------
    match /teachingMaterials/{materialId} {
      allow read: if isCallerApproved();
      allow write: if isCallerApproved() && (getCaller().data.role == 'admin' || getCaller().data.role == 'teacher');
      allow delete: if isCallerApproved() && (isCallerAdmin() || (getCaller().data.role == 'teacher' && resource.data.uploaderId == request.auth.uid));
    }


    // ---------------------
    // LIVE LESSONS + IMAGES
    // ---------------------
    match /liveLessons/{lessonId} {
      allow read: if isCallerApproved();

      allow create, update: if isCallerApproved()
        && getCaller().data.role == 'teacher'
        && (request.resource.data.teacherId == request.auth.uid || resource.data.teacherId == request.auth.uid);

      allow delete: if isCallerAdmin() || (isCallerApproved() && resource.data.teacherId == request.auth.uid);

      match /images/{imageId} {
        allow read: if isCallerApproved();
        allow write: if isCallerApproved() && get(/databases/$(database)/documents/liveLessons/$(lessonId)).data.teacherId == request.auth.uid;
      }
      
      match /breakoutWhiteboards/{whiteboardId} {
        allow read, write: if isCallerApproved();
      }

      match /responses/{responseId} {
        allow read: if isCallerApproved();
        allow create: if isCallerApproved() && request.resource.data.studentId == request.auth.uid;
      }
    }


    // ---------------------
    // GROUPS
    // ---------------------
    match /groups/{groupId} {
      function isGroupMember() { return request.auth.uid in resource.data.memberUids; }
      function isGroupTeacher() { return request.auth.uid == resource.data.teacherId; }
      function isApprovedAdmin() { return isCallerAdmin(); }
      function isParentOfGroupMember() {
          let caller = getCaller().data;
          return caller.role == 'parent' && caller.childUids.size() > 0 && caller.childUids.hasAny(resource.data.memberUids);
      }

      allow read: if isCallerApproved() && (isGroupMember() || isGroupTeacher() || isApprovedAdmin() || isParentOfGroupMember());
      allow list: if isCallerApproved(); // Filtered by query on client side

      allow create: if isCallerApproved() && getCaller().data.role == 'teacher';

      allow update: if isCallerApproved() && (
          isGroupTeacher() || (isGroupMember() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isSubmitted', 'submission']))
      );

      allow delete: if isCallerApproved() && (isGroupTeacher() || isApprovedAdmin());
    }


    match /groups/{groupId}/groupMessages/{messageId} {
      function isGroupMember2() { return request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.memberUids; }
      function isGroupTeacher2() { return request.auth.uid == get(/databases/$(database)/documents/groups/$(groupId)).data.teacherId; }

      allow read, list: if isCallerApproved() && (isGroupMember2() || isGroupTeacher2());
      allow create: if isCallerApproved() && (isGroupMember2() || isGroupTeacher2()) && request.resource.data.senderId == request.auth.uid;
    }


    // ---------------------
    // CALENDAR & TIMETABLES
    // ---------------------
    match /calendarEvents/{eventId} {
      allow read: if isCallerApproved();
      allow write: if isCallerAdmin();
    }

    match /timetables/{classId} {
      allow read: if isCallerApproved();
      allow write: if isCallerAdmin() || (isCallerApproved() && getCaller().data.role == 'teacher');
    }


    // ---------------------
    // TERMINAL REPORTS
    // ---------------------
    match /terminalReports/{reportId} {
      allow read: if isCallerApproved();
      allow write: if isCallerApproved() && (getCaller().data.role == 'admin' || getCaller().data.role == 'teacher');
    }
    
    // ---------------------
    // PUBLISHED FLYERS
    // ---------------------
    match /publishedFlyers/{flyerId} {
        allow read: if true;
        allow create, update, delete: if isCallerAdmin();
    }


    // ---------------------
    // DEFAULT DENY
    // ---------------------
    match /{path=**} {
      allow read, write: if false;
    }
  }
}
