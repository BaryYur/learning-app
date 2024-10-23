import React, {useState} from "react";

type TeacherTask = {
  id: string;
  title: string;
}

interface TeacherConversationsContextTypes {
  teacherConversations: TeacherTask[];
  addTeacherTask: (title: string) => void;
}

const TeacherConversationsContext = React.createContext({} as TeacherConversationsContextTypes);

export const TeacherConversationsContextProvider = ({ children } : { children: React.ReactNode }) => {
  const [teacherConversations, setTeacherConversations] = useState<TeacherTask[]>([{ id: "id1", title: "title 1" }, { id: "id2", title: "title 1" }]);

  const addTeacherTask = (title: string) => {
    setTeacherConversations(prevItems => {
      return [...prevItems, { id: Math.random().toString(), title }];
    });
  }

  return (
    <TeacherConversationsContext.Provider
      value={{
        teacherConversations,
        addTeacherTask,
      }}
    >
      {children}
    </TeacherConversationsContext.Provider>
  );
};

export default TeacherConversationsContext;