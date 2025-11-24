

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

      return isSignedIn()
        && (isAdmin || isTeacher)
        && request.resource.data.uid == newUserId
        && request.resource.data.status == 'pending'
        && 'name' in request.resource.data
        && 'email' in request.resource.data
        && 'role' in request.resource.data
        && (
          isAdmin ||
          (
            isTeacher &&
            (
              (
                request.resource.data.role == 'student' &&
                (
                  request.resource.data.class in caller.classesTaught ||
                  request.resource.data.class == caller.classTeacherOf
                )
              ) ||
              (
                request.resource.data.role == 'parent' &&
                exists(/databases/$(database)/documents/users/$(request.resource.data.childUids[0])) &&
                (
                  get(/databases/$(database)/documents/users/$(request.resource.data.childUids[0])).data.class 
                    in caller.classesTaught ||
                  get(/databases/$(database)/documents/users/$(request.resource.data.childUids[0])).data.class 
                    == caller.classTeacherOf
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
      // Allow a user to read their own profile explicitly without checking approval status
      allow get: if isSignedIn() && (request.auth.uid == userId || isCallerApproved());
      
      // Allow listing users only if the caller is approved (e.g. Admins/Teachers/Approved Students)
      allow list: if isCallerApproved();

      allow create: if
        (isSignedIn() && request.auth.uid == userId)
        || isAuthorizedToCreateUser(userId);

      allow update: if
        isCallerAdmin()
        ||
        (
          isSignedIn()
          && request.auth.uid == userId
          && request.resource.data.role == resource.data.role
          && request.resource.data.status == resource.data.status
        );

      allow delete: if isCallerAdmin();
    }
    
    // ---------------------
    // USER ACTIVITY LOGS
    // ---------------------
    match /userActivity/{logId} {
      // Allow any signed-in user to create a log (login/logout)
      allow create: if isSignedIn();
      
      // Allow Admins to read all logs. 
      // Allow Teachers to read logs (filtered by client query, but security-wise broad for now to allow filtering)
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

      allow read, update: if isCallerApproved() && isParticipant();
      allow list: if isCallerApproved();
      allow create: if isCallerApproved()
        && request.auth.uid in request.resource.data.participantUids;

      match /messages/{messageId} {

        function isParentParticipant() {
          return request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantUids;
        }

        allow read, list: if isCallerApproved() && isParentParticipant();

        allow create: if isCallerApproved()
          && isParentParticipant()
          && request.resource.data.senderId == request.auth.uid;

        allow update: if false;
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

      allow update: if
        isCallerAdmin()
        ||
        (
          isCallerApproved()
          && getCaller().data.role == 'teacher'
          && resource.data.teacherId == request.auth.uid
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

      allow list: if isCallerApproved();

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

      allow list: if isCallerApproved();

      allow create: if isCallerApproved()
        && (getCaller().data.role == 'teacher' || getCaller().data.role == 'admin');

      allow delete: if isCallerAdmin();
    }


    // ---------------------
    // GENERATED CONTENT
    // ---------------------
    match /generatedContent/{contentId} {

      allow get: if isCallerApproved()
        && getCaller().data.role == 'teacher'
        && request.auth.uid in resource.data.collaboratorUids;

      allow list: if isCallerApproved()
        && getCaller().data.role == 'teacher';

      allow create: if isCallerApproved()
        && getCaller().data.role == 'teacher'
        && request.resource.data.teacherId == request.auth.uid;

      allow update: if isCallerApproved()
        && getCaller().data.role == 'teacher'
        && request.auth.uid in resource.data.collaboratorUids;

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

      allow write: if isCallerApproved()
        && (getCaller().data.role == 'admin' || getCaller().data.role == 'teacher');

      allow delete: if isCallerApproved()
        && (
          isCallerAdmin()
          ||
          (
            getCaller().data.role == 'teacher'
            && resource.data.uploaderId == request.auth.uid
          )
        );
    }


    // ---------------------
    // LIVE LESSONS + IMAGES
    // ---------------------
    match /liveLessons/{lessonId} {

      allow read: if isCallerApproved();

      allow create: if isCallerApproved()
        && getCaller().data.role == 'teacher'
        && request.resource.data.teacherId == request.auth.uid;

      allow update: if isCallerApproved()
        && getCaller().data.role == 'teacher'
        && resource.data.teacherId == request.auth.uid;

      allow delete: if
        isCallerAdmin()
        ||
        (
          isCallerApproved()
          && getCaller().data.role == 'teacher'
          && resource.data.teacherId == request.auth.uid
        );

      match /images/{imageId} {
        allow read: if isCallerApproved();
        allow write: if isCallerApproved()
          && get(/databases/$(database)/documents/liveLessons/$(lessonId)).data.teacherId == request.auth.uid;
      }
      
      match /breakoutWhiteboards/{whiteboardId} {
        allow read, write: if isCallerApproved();
      }

      match /responses/{responseId} {
        allow read: if isCallerApproved()
          && (
            getCaller().data.role == 'teacher'
            || (
              getCaller().data.role == 'student'
              && resource.data.studentId == request.auth.uid
            )
          );
        
        allow list: if isCallerApproved()
          && getCaller().data.role == 'teacher';

        allow create: if isCallerApproved()
          && getCaller().data.role == 'student'
          && request.resource.data.studentId == request.auth.uid;

        allow update: if false;
        allow delete: if false;
      }
    }


    // ---------------------
    // GROUPS
    // ---------------------
    match /groups/{groupId} {

      function isGroupMember() {
        return request.auth.uid in resource.data.memberUids;
      }

      function isGroupTeacher() {
        return request.auth.uid == resource.data.teacherId;
      }

      function isApprovedAdmin() {
        return isCallerAdmin();
      }
      
      function isParentOfGroupMember() {
          let caller = getCaller().data;
          return caller.role == 'parent'
              && caller.childUids.size() > 0
              && caller.childUids.hasAny(resource.data.memberUids);
      }

      allow read: if isCallerApproved()
        && (isGroupMember() || isGroupTeacher() || isApprovedAdmin() || isParentOfGroupMember());

      allow create: if isCallerApproved()
        && getCaller().data.role == 'teacher';

      allow update: if isCallerApproved()
        && (
          isGroupTeacher()
          ||
          (
            isGroupMember()
            && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
              'isSubmitted', 'submission'
            ])
          )
        );

      allow delete: if isCallerApproved()
        && (isGroupTeacher() || isApprovedAdmin());

      allow list: if isCallerApproved();
    }


    match /groups/{groupId}/groupMessages/{messageId} {

      function isGroupMember2() {
        return request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.memberUids;
      }

      function isGroupTeacher2() {
        return request.auth.uid == get(/databases/$(database)/documents/groups/$(groupId)).data.teacherId;
      }

      allow read, list: if isCallerApproved()
        && (isGroupMember2() || isGroupTeacher2());

      allow create: if isCallerApproved()
        && (
          isGroupMember2()
          || isGroupTeacher2()
        )
        && request.resource.data.senderId == request.auth.uid;

      allow update, delete: if false;
    }


    // ---------------------
    // CALENDAR EVENTS
    // ---------------------
    match /calendarEvents/{eventId} {
      allow read: if isCallerApproved();
      allow write: if isCallerAdmin();
    }


    // ---------------------
    // TIMETABLES
    // ---------------------
    match /timetables/{classId} {
      allow read: if isCallerApproved();
      allow write: if isCallerAdmin();
    }


    // ---------------------
    // TERMINAL REPORTS
    // ---------------------
    match /terminalReports/{reportId} {
      allow read: if isCallerApproved();

      allow create: if isCallerApproved()
        && (
          getCaller().data.role == 'admin'
          || getCaller().data.role == 'teacher'
        );

      allow update: if isCallerApproved()
        && (
          getCaller().data.role == 'admin'
          || getCaller().data.role == 'teacher'
        );

      allow delete: if isCallerAdmin();
    }


    // ---------------------
    // REPORT SUMMARIES
    // ---------------------
    match /reportSummaries/{summaryId} {

      allow get: if isCallerApproved()
        && (
          getCaller().data.role == 'admin'
          ||
          (
            getCaller().data.role == 'teacher'
            && resource.data.classId == getCaller().data.classTeacherOf
          )
          ||
          (
            getCaller().data.role == 'student'
            && resource.data.studentId == request.auth.uid
          )
          ||
          (
            getCaller().data.role == 'parent'
            && resource.data.studentId in getCaller().data.childUids
          )
        );

      allow list: if isCallerApproved();

      allow create: if isCallerApproved()
        && (
          getCaller().data.role == 'admin'
          || getCaller().data.role == 'teacher'
        );

      allow update: if isCallerApproved()
        && (
          getCaller().data.role == 'admin'
          || getCaller().data.role == 'teacher'
        );

      allow delete: if isCallerAdmin();
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