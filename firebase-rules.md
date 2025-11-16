rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ---------------------
    // Safe helper functions (for general use)
    // ---------------------
    function isSignedIn() {
      return request.auth != null;
    }

    function isCallerApproved() {
      // An admin's approval status doesn't prevent them from acting.
      return isSignedIn() && exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'approved' ||
              get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    function isAuthorizedToCreateUser(newUserId) {
      let callerProfile = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
      let isTeacher = callerProfile.role == 'teacher';
      let isAdmin = callerProfile.role == 'admin';

      return isSignedIn() &&
             (isAdmin || isTeacher) &&
             // Basic data validation
             request.resource.data.uid == newUserId &&
             request.resource.data.status == 'pending' &&
             'name' in request.resource.data &&
             'email' in request.resource.data &&
             'role' in request.resource.data &&
             // Authorization logic:
             (
               isAdmin ||
               (
                 isTeacher &&
                 (
                   (
                     request.resource.data.role == 'student' &&
                     (request.resource.data.class in callerProfile.classesTaught ||
                      request.resource.data.class == callerProfile.classTeacherOf)
                   ) ||
                   (
                     request.resource.data.role == 'parent' &&
                     exists(/databases/$(database)/documents/users/$(request.resource.data.childUids[0])) &&
                     (get(/databases/$(database)/documents/users/$(request.resource.data.childUids[0])).data.class in callerProfile.classesTaught ||
                      get(/databases/$(database)/documents/users/$(request.resource.data.childUids[0])).data.class == callerProfile.classTeacherOf)
                   )
                 )
               )
             );
    }


    // ---------------------
    // users collection
    // ---------------------
    match /users/{userId} {
      // Any user can read their own profile. Approved non-students can read others.
      // This is structured to avoid recursive checks that cause permission errors.
      allow read: if isSignedIn() && (
        request.auth.uid == userId ||
        (
          exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'approved' &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role != 'student'
        )
      );

      // A user can create their own profile (self-registration) OR an authorized admin/teacher can create one.
      allow create: if (isSignedIn() && request.auth.uid == userId) || (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && isAuthorizedToCreateUser(userId));

      // An admin can update any profile, OR a user can update their own profile with restrictions.
      allow update: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || (
        isSignedIn() && request.auth.uid == userId &&
        request.resource.data.role == resource.data.role && // Cannot change own role
        request.resource.data.status == resource.data.status // Cannot change own status
      );

      // Only an admin can delete a user document.
      allow delete: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }


    // ---------------------
    // schoolConfig
    // ---------------------
    match /schoolConfig/{docId} {
      allow read: if true; // All users need to read school name, etc.
      // INLINED ADMIN CHECK: Check role directly to avoid recursive rule evaluation errors.
      allow write: if isSignedIn() && exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ---------------------
    // activationTokens
    // ---------------------
    match /activationTokens/{tokenId} {
      // INLINED ADMIN CHECK: Check role directly to avoid recursive rule evaluation errors.
      allow read, write: if isSignedIn() && exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // ---------------------
    // Messaging
    // ---------------------
    match /conversations/{conversationId} {
      function isParticipant() {
        return request.auth.uid in resource.data.participantUids;
      }
      
      allow read, update: if isCallerApproved() && isParticipant();
      allow list: if isCallerApproved(); // Client must constrain with `where('participantUids', 'array-contains', uid)`
      allow create: if isCallerApproved() && request.auth.uid in request.resource.data.participantUids;

      match /messages/{messageId} {
        function isParentParticipant() {
          return request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participantUids;
        }
        
        allow read, list: if isCallerApproved() && isParentParticipant();
        allow create: if isCallerApproved() && 
                        isParentParticipant() && 
                        request.resource.data.senderId == request.auth.uid;
        allow update: if isCallerApproved() && isParentParticipant();
      }
    }


    // ---------------------
    // assignments
    // ---------------------
    match /assignments/{assignmentId} {
      allow read: if isCallerApproved();
      allow create: if isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && request.resource.data.teacherId == request.auth.uid;
      allow update: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || (isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && resource.data.teacherId == request.auth.uid);
      allow delete: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || (isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && resource.data.teacherId == request.auth.uid);
    }

    // ---------------------
    // submissions
    // ---------------------
    match /submissions/{submissionId} {
      // `get` can inspect the document being read.
      allow get: if isCallerApproved() && (
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') ||
        (resource.data.studentId == request.auth.uid) ||
        (resource.data.teacherId == request.auth.uid) ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'parent' && resource.data.studentId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.childUids)
      );
      
      // `list` relies on query constraints. These rules allow role-based queries that are constrained by UID on the client-side.
      // (e.g., where('studentId', '==', uid) or where('parentUids', 'array-contains', uid))
      allow list: if isCallerApproved() && (
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher') ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student') ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'parent')
      );
      
      allow create: if isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student' && request.resource.data.studentId == request.auth.uid;
      
      allow update: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || (isCallerApproved() && ((get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && resource.data.teacherId == request.auth.uid) || (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student' && resource.data.studentId == request.auth.uid)));
      
      allow delete: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || (isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && resource.data.teacherId == request.auth.uid);
    }

    // ---------------------
    // attendance
    // ---------------------
    match /attendance/{recordId} {
        allow read: if isCallerApproved();
        allow create: if isCallerApproved() &&
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' &&
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.classTeacherOf == request.resource.data.classId &&
                        request.resource.data.teacherId == request.auth.uid;
        allow update: if isCallerApproved() &&
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' &&
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.classTeacherOf == resource.data.classId;
        allow delete: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    // ---------------------
    // notifications
    // ---------------------
    match /notifications/{notificationId} {
      allow get: if isCallerApproved() && resource.data.userId == request.auth.uid;
      allow update: if isCallerApproved() && resource.data.userId == request.auth.uid;
      allow list: if isCallerApproved(); 
      allow create: if isCallerApproved() && (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow delete: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    // ---------------------
    // generatedContent
    // ---------------------
    match /generatedContent/{contentId} {
      allow get: if isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && request.auth.uid in resource.data.collaboratorUids;
      allow list: if isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
      allow create: if isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && request.resource.data.teacherId == request.auth.uid;
      allow update: if isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && request.auth.uid in resource.data.collaboratorUids;
      allow delete: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || (isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && resource.data.teacherId == request.auth.uid);
    }
    
    // ---------------------
    // videoContent
    // ---------------------
    match /videoContent/{creatorId}/videos/{videoId} {
        allow read: if isCallerApproved();
        allow create: if isCallerApproved() && (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') && creatorId == request.auth.uid;
        allow delete: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || (isCallerApproved() && creatorId == request.auth.uid);
    }

    // ---------------------
    // teachingMaterials
    // ---------------------
    match /teachingMaterials/{materialId} {
      allow read: if isCallerApproved();
      // Only admins and teachers can create/update.
      allow write: if isCallerApproved() && (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher');
      // Only admin or original uploader can delete.
      allow delete: if isCallerApproved() && ((exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && resource.data.uploaderId == request.auth.uid));
    }

    // ---------------------
    // Live Lessons
    // ---------------------
    match /liveLessons/{lessonId} {
      allow read: if isCallerApproved();
      allow create: if isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && request.resource.data.teacherId == request.auth.uid;
      allow update: if isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && resource.data.teacherId == request.auth.uid;
      allow delete: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || (isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && resource.data.teacherId == request.auth.uid);
      
      match /images/{imageId} {
        allow read: if isCallerApproved();
        allow write: if isCallerApproved() && get(/databases/$(database)/documents/liveLessons/$(lessonId)).data.teacherId == request.auth.uid;
      }
    }
    
    match /liveLessons/{lessonId}/responses/{responseId} {
      allow read: if isCallerApproved() && (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' || (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student' && resource.data.studentId == request.auth.uid));
      allow list: if isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
      allow create: if isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student' && request.resource.data.studentId == request.auth.uid;
      allow update: if false; // Responses are immutable
      allow delete: if false;
    }
    
    // ---------------------
    // Group Work
    // ---------------------
    match /groups/{groupId} {
        function isGroupMember() {
            return request.auth.uid in resource.data.memberUids;
        }
        function isGroupTeacher() {
            return request.auth.uid == resource.data.teacherId;
        }
        function isApprovedAdmin() {
            return exists(/databases/$(database)/documents/users/$(request.auth.uid)) && 
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
        }
        function isParent() {
            return exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'parent';
        }

        allow read: if isCallerApproved() && (isGroupMember() || isGroupTeacher() || isApprovedAdmin() || isParent());
        allow create: if isCallerApproved() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
        allow update: if isCallerApproved() && (
            (isGroupTeacher()) || // Teacher can update anything
            (isGroupMember() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isSubmitted', 'submission'])) // Member can only submit
        );
        allow delete: if isCallerApproved() && (isGroupTeacher() || isApprovedAdmin());
        allow list: if isCallerApproved(); // Client side will filter by memberUids, teacherId or parent's childUids.
    }

    match /groups/{groupId}/groupMessages/{messageId} {
        function isGroupMember(groupId) {
            return request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.memberUids;
        }
        function isGroupTeacher(groupId) {
            return request.auth.uid == get(/databases/$(database)/documents/groups/$(groupId)).data.teacherId;
        }

        allow read, list: if isCallerApproved() && (isGroupMember(groupId) || isGroupTeacher(groupId));
        allow create: if isCallerApproved() && (isGroupMember(request.resource.data.groupId) || isGroupTeacher(request.resource.data.groupId)) && request.resource.data.senderId == request.auth.uid;
        allow delete, update: if false; // Messages are immutable for simplicity
    }


    // ---------------------
    // Other Collections
    // ---------------------
    match /calendarEvents/{eventId} {
        allow read: if isCallerApproved();
        allow write: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    match /timetables/{classId} {
      allow read: if isCallerApproved();
      allow write: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    match /terminalReports/{reportId} {
      allow read: if isCallerApproved();
      allow create: if isCallerApproved() && ((exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher');
      allow update: if isCallerApproved() && ((exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher');
      allow delete: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }

    match /reportSummaries/{summaryId} {
      allow get: if isCallerApproved() && (
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
          (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher' && resource.data.classId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.classTeacherOf) ||
          (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'student' && resource.data.studentId == request.auth.uid) ||
          (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'parent' && resource.data.studentId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.childUids)
      );
      allow list: if isCallerApproved();
      allow create: if isCallerApproved() && ((exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher');
      allow update: if isCallerApproved() && ((exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher');
      allow delete: if (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Default deny for safety
    match /{path=**} {
      allow read, write: if false;
    }
  }
}
