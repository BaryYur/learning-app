import React, { useState } from "react";

type TeacherTask = {
  id: string;
  title: string;
}

interface TeacherConversationsContextTypes {
  teacherConversations: TeacherTask[];
}

const TeacherConversationsContext = React.createContext({} as TeacherConversationsContextTypes);

export const TeacherConversationsContextProvider = ({ children } : { children: React.ReactNode }) => {
  const [teacherConversations, setTeacherConversations] = useState([]);

  return (
    <TeacherConversationsContext.Provider
      value={{
        teacherConversations,
      }}
    >
      {children}
    </TeacherConversationsContext.Provider>
  );
};

export default TeacherConversationsContext;