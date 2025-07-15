
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AlternativeCareerProps {
  careers: Array<{
    career: {
      id: string | number;
      title: string;
      description: string;
      skills: string[];
      growthOutlook: string;
    };
    compatibilityScore: number;
  }>;
}

const AlternativeCareerOptions: React.FC<AlternativeCareerProps> = ({ careers }) => {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {careers.length > 0 ? (
        careers.map((career, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-career-indigo">
                {career.career.title}
              </CardTitle>
              <CardDescription>
                Compatibility: {career.compatibilityScore}%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">{career.career.description}</p>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-1">KEY SKILLS</h4>
                <div className="flex flex-wrap gap-1">
                  {career.career.skills.slice(0, 3).map((skill, idx) => (
                    <span 
                      key={idx} 
                      className="inline-block bg-career-light-blue bg-opacity-10 text-career-blue text-xs px-2 py-1 rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="col-span-3 text-center py-10 text-gray-500">
          No alternative careers available based on your profile.
        </div>
      )}
    </div>
  );
};

export default AlternativeCareerOptions;
