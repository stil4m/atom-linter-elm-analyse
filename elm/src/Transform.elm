module Transform exposing (analysesToLints)

import AtomLinter exposing (Message)
import ElmAnalyse exposing (getCoords)


analysesToLints : String -> List ElmAnalyse.Message -> List AtomLinter.Message
analysesToLints projectPath analyses =
    List.map (convert projectPath) analyses


convert : String -> ElmAnalyse.Message -> AtomLinter.Message
convert projectPath analysis =
    AtomLinter.Message
        "warning"
        { file = projectPath ++ "/" ++ analysis.value.file
        , position = getCoords analysis
        }
        analysis.type_
        analysis.message
